-- ============================================================================
-- Полная история изменений на уровне БД (для комплаенса / append-only аудита)
-- ----------------------------------------------------------------------------
-- Идея: триггер срабатывает ВНУТРИ базы на любое INSERT/UPDATE/DELETE и
-- сохраняет снимок строки "было -> стало". Ловит ВСЁ — и приложение, и
-- фоновые джобы, и ручной SQL, в обход api-gateway. Обойти нельзя.
--
-- Механизм универсальный: одна таблица истории + одна функция на все таблицы.
-- Чтобы покрыть ещё одну таблицу — добавь один CREATE TRIGGER в конце файла.
-- ============================================================================

-- Отдельная схема, чтобы не смешивать с доменными таблицами
CREATE SCHEMA IF NOT EXISTS audit;

-- ----------------------------------------------------------------------------
-- 1. Таблица истории — единая для всех отслеживаемых таблиц
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit.row_history (
    id          BIGSERIAL PRIMARY KEY,
    table_name  TEXT        NOT NULL,            -- какая таблица (payments, users, ...)
    row_id      BIGINT,                          -- id изменённой строки
    op          TEXT        NOT NULL,            -- INSERT | UPDATE | DELETE
    old_row     JSONB,                           -- как было (NULL при INSERT)
    new_row     JSONB,                           -- как стало (NULL при DELETE)
    changed_by  BIGINT,                          -- пользователь приложения (см. п.3)
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Поиск истории конкретной строки и выборка по времени
CREATE INDEX IF NOT EXISTS idx_row_history_table_row
    ON audit.row_history (table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_row_history_changed_at
    ON audit.row_history (changed_at);

COMMENT ON TABLE audit.row_history IS
    'Append-only история изменений строк (заполняется триггерами). Не редактировать/не удалять вручную.';

-- ----------------------------------------------------------------------------
-- 2. Универсальная триггерная функция
-- ----------------------------------------------------------------------------
-- TG_OP / TG_TABLE_NAME подставляет сама база. OLD/NEW — строки до/после.
-- to_jsonb(OLD|NEW) сериализует строку любой таблицы в JSON, поэтому функция
-- не привязана к конкретной схеме и работает для любой таблицы.
CREATE OR REPLACE FUNCTION audit.log_row_change() RETURNS trigger AS $$
DECLARE
    v_old  JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
    v_new  JSONB := CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END;
    -- кто менял: приложение кладёт это в сессию через SET LOCAL (см. п.3).
    -- Если не задано (ручной SQL, фоновая джоба без проброса) — будет NULL.
    v_user BIGINT := NULLIF(current_setting('app.current_user_id', true), '')::BIGINT;
BEGIN
    INSERT INTO audit.row_history (table_name, row_id, op, old_row, new_row, changed_by)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(v_new->>'id', v_old->>'id')::BIGINT,
        TG_OP,
        v_old,
        v_new,
        v_user
    );
    RETURN NULL; -- AFTER-триггер: возвращаемое значение игнорируется
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Кто менял (app.current_user_id)
-- ----------------------------------------------------------------------------
-- База видит только подключение `postgres`, а не пользователя приложения.
-- Поэтому сервис в начале транзакции должен сказать БД, кто это:
--
--     SET LOCAL app.current_user_id = '42';   -- только на текущую транзакцию
--
-- В Prisma это делается перед записью внутри $transaction:
--     await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`)
--
-- Без этого триггер всё равно отработает, но changed_by будет NULL
-- (current_setting(..., true) со вторым аргументом true возвращает NULL,
--  если параметр в сессии не задан, — падать не будет).

-- ----------------------------------------------------------------------------
-- 4. Вешаем триггеры на все важные для комплаенса таблицы
-- ----------------------------------------------------------------------------
-- Цикл по списку: для каждой таблицы создаётся триггер <table>_row_audit.
-- Добавить новую таблицу = просто допиши её имя в массив ниже.
-- Шумные/производные таблицы намеренно НЕ включены (см. п.5).
DO $$
DECLARE
    t   TEXT;
    -- Таблицы под аудитом, сгруппированы по смыслу:
    audited_tables TEXT[] := ARRAY[
        -- Финансы и договоры
        'payments', 'payment_accounts', 'company_bank_accounts',
        'budgets', 'budget_items', 'acts', 'act_items',
        'payroll', 'bonuses',
        'supplier_orders', 'supplier_order_items',
        'commercial_proposals', 'proposal_lines',
        -- NB: price_lists / price_list_items — мёртвые таблицы (в коде не
        -- используются). Живой параметрический прайс (price_items, price_*) —
        -- это справочник/конфиг, аудитом не покрывается (как dictionary_*).
        -- Контрагенты
        'clients', 'client_portal_access', 'contractors', 'suppliers',
        -- Доступ / личности / безопасность
        'accounts', 'users', 'roles', 'registration_requests',
        -- Кадры
        'employee_documents', 'attendance', 'time_off_requests',
        -- Охрана труда (HSE)
        'safety_incidents', 'safety_training_records', 'safety_trainings',
        -- Качество и стройконтроль
        'inspections', 'defects', 'control_points', 'quality_standards',
        -- Проекты и объекты
        'projects', 'construction_sites', 'building_objects', 'unique_facilities',
        -- Документы и техника
        'documents', 'equipment', 'equipment_maintenance'
    ];
BEGIN
    FOREACH t IN ARRAY audited_tables LOOP
        -- пропускаем, если таблицы нет в этой БД (безопасно для разных окружений)
        IF to_regclass(t) IS NULL THEN
            RAISE NOTICE 'audit: таблица % не найдена, пропущена', t;
            CONTINUE;
        END IF;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_row_audit', t);
        EXECUTE format(
            'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I '
            'FOR EACH ROW EXECUTE FUNCTION audit.log_row_change()',
            t || '_row_audit', t
        );
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Намеренно НЕ под аудитом (шум / производные / самоссылка):
--    chat_*, notifications, announcements, push_subscriptions  — транзиентное
--    user_sessions                                              — высокая частота
--    task_status_history / task_time_logs / task_comments / tasks — высокий churn
--    dashboard_widgets                                          — UI-настройки
--    dictionary_*, norm_*, wiki_pages, training_*               — справочники/контент
--    generated_reports, report_templates, predictions, *_calculator* — производное
--    warehouse_*, inventory_*, supplier_price_history          — складской churn/история
--    automation_*, event_log                                   — служебное (не аудитим аудит)
-- Любую из них можно добавить позже в массив выше при необходимости.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 6. Неизменяемость (опционально, для комплаенса)
-- ----------------------------------------------------------------------------
-- Запрет переписывать/удалять журнал для НЕ-суперпользователя.
-- ВНИМАНИЕ: если приложение ходит в БД под `postgres` (superuser), REVOKE
-- не действует — superuser игнорирует GRANT'ы. Для настоящей неизменяемости
-- приложение должно ходить под обычной ролью. Раскомментируй под свою роль:
--
--   REVOKE UPDATE, DELETE, TRUNCATE ON audit.row_history FROM <app_role>;
--   GRANT  INSERT, SELECT            ON audit.row_history TO   <app_role>;

-- ----------------------------------------------------------------------------
-- Проверка после применения:
--   UPDATE payments SET notes = 'тест аудита' WHERE id = (SELECT id FROM payments LIMIT 1);
--   SELECT table_name, row_id, op, changed_by, changed_at,
--          old_row->>'notes' AS было, new_row->>'notes' AS стало
--   FROM audit.row_history ORDER BY id DESC LIMIT 5;
-- ----------------------------------------------------------------------------

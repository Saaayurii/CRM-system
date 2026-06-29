-- ============================================================================
-- Transactional Outbox для доменных событий с бизнес-семантикой (вариант B)
-- ----------------------------------------------------------------------------
-- Вариант A (audit.row_history relay) даёт события на уровне СТРОКИ
-- (entity.create/update/delete) и ловит всё, но не знает бизнес-смысла:
-- «переназначили задачу» и «сменили статус» — оба просто UPDATE.
--
-- Этот outbox — для СЕМАНТИЧЕСКИХ событий (task.status_changed, deal.won, ...).
-- Сервис в ТОЙ ЖЕ транзакции, что и бизнес-запись, кладёт строку сюда
-- (OutboxService.emitWith(tx, ...)). Атомарно: либо и изменение, и событие, либо
-- ничего. audit-service (OutboxRelayService) тейлит таблицу по курсору и
-- публикует в тот же топик Kafka `audit.events` — форма payload идентична
-- relay'ю/gateway, оба consumer'а (audit-persist + automation) без изменений.
--
-- Лежит в public (не в audit-схеме): пишут её ДОМЕННЫЕ сервисы из своих tx,
-- поэтому таблица должна быть видна по обычному DATABASE_URL без квалификации.
-- Идемпотентна.
--
-- NB: и продьюсер (OutboxService.onModuleInit), и релей (OutboxRelayService)
-- сами создают event_outbox идемпотентно на boot — деплой кода не зависит от
-- этой миграции. Применять её отдельно НЕ обязательно (belt-and-suspenders).
-- Критично: outbox-INSERT идёт в бизнес-транзакции, поэтому отсутствие таблицы
-- откатило бы саму запись (напр. смену статуса задачи) — отсюда self-create.
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_outbox (
    id          BIGSERIAL    PRIMARY KEY,
    account_id  INTEGER,                          -- тенант (для изоляции в automation)
    entity_type TEXT         NOT NULL,            -- task | deal | ...
    entity_id   BIGINT,
    action      TEXT         NOT NULL,            -- status_changed | assigned | won | ...
    user_id     BIGINT,                           -- кто инициировал
    description TEXT,
    changes     JSONB,                            -- { status: { from, to } }, ...
    metadata    JSONB,
    project_id  INTEGER,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE event_outbox IS
    'Transactional outbox семантических доменных событий. Сервис пишет в той же tx, что и бизнес-запись; audit-service публикует в Kafka audit.events.';

-- Курсор релея (как у row_history): single-row, last_id = последняя опубликованная.
CREATE TABLE IF NOT EXISTS event_outbox_relay_cursor (
    id          SMALLINT     PRIMARY KEY DEFAULT 1,
    last_id     BIGINT       NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT event_outbox_relay_cursor_singleton CHECK (id = 1)
);

-- Старт с текущего MAX(id): не переигрываем бэклог как «новые» события.
INSERT INTO event_outbox_relay_cursor (id, last_id)
VALUES (1, COALESCE((SELECT MAX(id) FROM event_outbox), 0))
ON CONFLICT (id) DO NOTHING;

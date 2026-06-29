-- ============================================================================
-- Outbox-релей поверх audit.row_history → Kafka (audit.events)
-- ----------------------------------------------------------------------------
-- audit.row_history (см. audit_row_history.sql) заполняется триггерами ВНУТРИ
-- базы и ловит ВСЁ: приложение, фоновые джобы BullMQ, ручной SQL — даже записи
-- в обход api-gateway. Это и есть идеальный transactional outbox.
--
-- Релей (audit-service: RowHistoryRelayService) читает эту таблицу по курсору и
-- публикует доменные события в Kafka, поэтому теперь событие порождается там,
-- где реально меняются данные, а не из HTTP-глагола в gateway. «Скрытая дыра»
-- (запись мимо gateway не порождала событие) закрывается.
--
-- Эта миграция добавляет durable-курсор «до какого id уже опубликовано».
-- Идемпотентна — можно применять повторно.
-- ============================================================================

-- Курсор релея: single-row таблица в той же служебной схеме audit.
CREATE TABLE IF NOT EXISTS audit.row_history_relay_cursor (
    id          SMALLINT     PRIMARY KEY DEFAULT 1,
    last_id     BIGINT       NOT NULL DEFAULT 0,   -- последний опубликованный row_history.id
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT row_history_relay_cursor_singleton CHECK (id = 1)
);

COMMENT ON TABLE audit.row_history_relay_cursor IS
    'Курсор релея audit.row_history→Kafka. last_id = последняя опубликованная строка. Одна строка (id=1).';

-- Инициализация курсора текущим MAX(id): не переигрываем весь исторический
-- бэклог как «новые» события (иначе automation завалит пользователей старыми
-- уведомлениями). Релей начинает с «здесь и сейчас».
INSERT INTO audit.row_history_relay_cursor (id, last_id)
VALUES (1, COALESCE((SELECT MAX(id) FROM audit.row_history), 0))
ON CONFLICT (id) DO NOTHING;

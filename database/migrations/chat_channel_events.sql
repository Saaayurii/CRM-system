-- Журнал действий администраторов чат-канала («Недавние действия», Telegram-style).
-- Пишется best-effort из chat-service; используется правой панелью группы.
CREATE TABLE IF NOT EXISTS chat_channel_events (
  id            BIGSERIAL PRIMARY KEY,
  channel_id    INTEGER      NOT NULL,
  account_id    INTEGER      NOT NULL,
  actor_user_id INTEGER,
  action        VARCHAR(64)  NOT NULL,
  meta          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Выборка последних действий по каналу (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_chat_channel_events_channel
  ON chat_channel_events (channel_id, created_at DESC);

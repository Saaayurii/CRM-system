-- Отложенные сообщения чата («Отправить позже»).
-- Доставляются BullMQ-воркером chat-service в назначенное время (scheduled_at),
-- после доставки строка удаляется. Идемпотентно.

CREATE TABLE IF NOT EXISTS chat_scheduled_messages (
  id                  SERIAL PRIMARY KEY,
  channel_id          INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL,
  topic_id            INTEGER,
  message_text        TEXT,
  message_type        VARCHAR(50) NOT NULL DEFAULT 'text',
  attachments         JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_to_message_id INTEGER,
  silent              BOOLEAN NOT NULL DEFAULT false,
  scheduled_at        TIMESTAMP NOT NULL,
  job_id              VARCHAR(120),
  created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_scheduled_channel_user
  ON chat_scheduled_messages (channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_scheduled_at
  ON chat_scheduled_messages (scheduled_at);

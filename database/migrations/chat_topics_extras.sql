-- CRM: доп. возможности тем чата — per-topic закреп, мут и скрытие.
-- Идемпотентно.

-- Закреплённые сообщения у каждой темы (свои, не общие на канал)
ALTER TABLE chat_topics ADD COLUMN IF NOT EXISTS pinned_messages JSONB DEFAULT '[]';

-- Per-user per-topic: мут уведомлений и скрытие темы из списка
ALTER TABLE chat_topic_reads ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_topic_reads ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP;
ALTER TABLE chat_topic_reads ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

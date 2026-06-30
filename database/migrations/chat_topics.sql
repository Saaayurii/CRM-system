-- CRM: темы чата (Telegram-style forum topics)
-- Группа (chat_channels.channel_type = 'group') может быть переведена в режим тем
-- (settings.topicsEnabled = true). Тогда лента сообщений делится на темы:
-- у каждой темы своя иконка-эмодзи, цвет и свой поток сообщений (chat_messages.topic_id).
-- Идемпотентно: можно прогонять повторно.

-- Темы внутри канала
CREATE TABLE IF NOT EXISTS chat_topics (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_emoji VARCHAR(32),
    color VARCHAR(20),
    created_by_user_id INTEGER,
    is_general BOOLEAN DEFAULT FALSE,   -- несносимая тема «Общее» (General)
    is_closed BOOLEAN DEFAULT FALSE,    -- закрыта: писать могут только админы
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_at TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_topics_channel ON chat_topics(channel_id) WHERE deleted_at IS NULL;

-- Per-user per-topic состояние прочтения (аналог chat_channel_members.last_read_at, но на тему)
CREATE TABLE IF NOT EXISTS chat_topic_reads (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES chat_topics(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    last_read_at TIMESTAMP,
    UNIQUE(topic_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_topic_reads_user ON chat_topic_reads(user_id);

-- Привязка сообщения к теме (NULL = канал без тем / старое сообщение)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES chat_topics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_topic ON chat_messages(channel_id, topic_id, created_at);

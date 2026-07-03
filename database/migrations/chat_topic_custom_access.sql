-- CRM: поимённый доступ к записи в теме
-- У темы post_permission уже поддерживал 'all' | 'admins'. Добавляем режим
-- 'custom': писать могут владелец/админы + перечисленные пользователи.
-- allowed_user_ids — JSON-массив id пользователей (актуален только при 'custom').
-- Идемпотентно.

ALTER TABLE chat_topics
    ADD COLUMN IF NOT EXISTS allowed_user_ids JSONB;

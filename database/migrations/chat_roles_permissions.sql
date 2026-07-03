-- CRM: роли и права в чатах и темах
-- Трёхуровневая роль участника (owner/admin/member), персональные ограничения
-- участника и права на уровне темы (кто может писать).
-- Идемпотентно: можно прогонять повторно.

-- 1) Роль «владелец»: у каждого канала владелец = создатель.
--    Бэкфилл роли для строки участника, соответствующей created_by_user_id.
--    Раньше создатель имел role='admin'; теперь выделяем отдельную роль 'owner'.
UPDATE chat_channel_members m
SET role = 'owner'
FROM chat_channels c
WHERE m.channel_id = c.id
  AND m.user_id = c.created_by_user_id
  AND (m.role IS DISTINCT FROM 'owner');

-- 2) Персональные ограничения участника (оверрайды сверх прав канала).
--    NULL = наследует права канала; ключ = false = запрещено конкретно этому
--    участнику (напр. {"sendMedia": false}). Набор ключей тот же, что у
--    chat_channels.settings.permissions.
ALTER TABLE chat_channel_members
    ADD COLUMN IF NOT EXISTS permissions JSONB;

-- 3) Права на уровне темы: кто может писать в теме.
--    'all'    — все участники (по правам канала);
--    'admins' — только владелец/админы.
--    Отличается от is_closed (жёсткая заморозка) — это мягкое ограничение записи.
ALTER TABLE chat_topics
    ADD COLUMN IF NOT EXISTS post_permission VARCHAR(20) DEFAULT 'all';

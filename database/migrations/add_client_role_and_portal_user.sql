-- Добавление роли "Клиент" (id=15) и расширение client_portal_access
-- для авторизации клиентов в портале (login + password + связь с users)

-- 1) Роль клиента (read-only внешний пользователь)
INSERT INTO roles (id, name, code, description, permissions)
VALUES (15, 'Клиент', 'client', 'Внешний клиент компании — только просмотр своих проектов', '{"all": "view", "chat": "own"}')
ON CONFLICT (id) DO NOTHING;

-- Подстраиваем sequence, если в roles были вставлены строки без указания id
SELECT setval(pg_get_serial_sequence('roles', 'id'),
              GREATEST((SELECT MAX(id) FROM roles), 15));

-- 2) Поля авторизации в client_portal_access
ALTER TABLE client_portal_access
    ADD COLUMN IF NOT EXISTS login          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS password_hash  VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- login уникален в рамках одного account_id (узнаём через client → accounts)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_client_portal_login
    ON client_portal_access (login)
    WHERE login IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_portal_user
    ON client_portal_access (user_id);

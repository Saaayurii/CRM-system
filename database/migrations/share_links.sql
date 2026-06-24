-- CRM: внешние шаре-ссылки (UUID) на сущности
-- Централизованный реестр публичных read-only ссылок: один UUID-токен →
-- (entity_type, entity_id, account_id). Внутренние числовые id и dashboard-роуты
-- не меняются — это параллельный публичный доступ.

CREATE TABLE IF NOT EXISTS share_links (
    id                 SERIAL PRIMARY KEY,
    token              UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    account_id         INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    entity_type        VARCHAR(64) NOT NULL,
    entity_id          INTEGER NOT NULL,
    created_by_user_id INTEGER,
    title              VARCHAR(255),
    permissions        JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at         TIMESTAMP,
    revoked_at         TIMESTAMP,
    view_count         INTEGER NOT NULL DEFAULT 0,
    last_viewed_at     TIMESTAMP,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_account ON share_links(account_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_share_links_entity ON share_links(account_id, entity_type, entity_id);

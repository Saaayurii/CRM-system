-- Инвайты для регистрации клиентов в клиентском портале
-- Аналог member_invites, но для внешних пользователей (roleId = 15)
-- Источник: после accept автоматически создаётся Client + ClientPortalAccess + User

CREATE TABLE IF NOT EXISTS client_invites (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note VARCHAR(255),
    -- предзаполненные доступы к разделам портала
    can_view_progress    BOOLEAN DEFAULT TRUE,
    can_view_photos      BOOLEAN DEFAULT TRUE,
    can_view_documents   BOOLEAN DEFAULT FALSE,
    can_view_financials  BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    used_at TIMESTAMP,
    used_by_client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    used_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_invites_token ON client_invites(token);
CREATE INDEX IF NOT EXISTS idx_client_invites_account ON client_invites(account_id);

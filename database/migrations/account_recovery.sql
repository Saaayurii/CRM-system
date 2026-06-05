-- ===========================================
-- Account recovery via email (password reset)
-- ===========================================
-- password_reset_tokens: один токен на email, покрывает все аккаунты
--   пользователя (клиент / админ / разные компании). Хранится только хеш.
-- account_recovery_log: журнал «кто восстановил аккаунт», изолирован
--   по account_id (видят админы своей компании).
-- ===========================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_email      ON password_reset_tokens (email);

CREATE TABLE IF NOT EXISTS account_recovery_log (
  id           SERIAL PRIMARY KEY,
  account_id   INTEGER NOT NULL,
  user_id      INTEGER NOT NULL,
  email        VARCHAR(255) NOT NULL,
  user_name    VARCHAR(255),
  role_id      INTEGER,
  account_name VARCHAR(255),
  ip_address   VARCHAR(45),
  user_agent   VARCHAR(500),
  recovered_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arl_account ON account_recovery_log (account_id);

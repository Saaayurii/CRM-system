-- ===========================================
-- Account recovery via phone (SMS OTP)
-- ===========================================
-- phone_reset_codes: один 6-значный код на нормализованный телефон
--   (последние 10 цифр). Хранится только sha256-хеш, лимит попыток, TTL.
-- account_recovery_log.method: способ восстановления (email | phone).
-- ===========================================

CREATE TABLE IF NOT EXISTS phone_reset_codes (
  id          SERIAL PRIMARY KEY,
  phone       VARCHAR(32) NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  used_at     TIMESTAMP,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prc_phone ON phone_reset_codes (phone);

ALTER TABLE account_recovery_log
  ADD COLUMN IF NOT EXISTS method VARCHAR(20) NOT NULL DEFAULT 'email';

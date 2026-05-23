-- Расширение accounts: реквизиты юр. лица + ссылки на директора и главбуха
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS legal_form VARCHAR(50),         -- ООО / ИП / Самозанятый
  ADD COLUMN IF NOT EXISTS inn VARCHAR(20),
  ADD COLUMN IF NOT EXISTS kpp VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ogrn VARCHAR(20),
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS actual_address TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS phone_ext VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS director_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accountant_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Банковские реквизиты компании (расчётные счета)
CREATE TABLE IF NOT EXISTS company_bank_accounts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  bank_name VARCHAR(255) NOT NULL,
  bik VARCHAR(20),
  settlement_account VARCHAR(50),
  correspondent_account VARCHAR(50),
  bank_inn VARCHAR(20),
  bank_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_account_id
  ON company_bank_accounts(account_id);

COMMENT ON TABLE company_bank_accounts IS 'Банковские реквизиты (расчётные счета) компании';

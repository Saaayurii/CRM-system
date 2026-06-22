-- CRM: воронка продаж (сделки + настраиваемые стадии)
CREATE TABLE IF NOT EXISTS deal_stages (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20) DEFAULT '#64748b',
    sort_order INTEGER DEFAULT 0,
    is_won BOOLEAN DEFAULT FALSE,
    is_lost BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deal_stages_account ON deal_stages(account_id);

CREATE TABLE IF NOT EXISTS deals (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    stage_id INTEGER NOT NULL REFERENCES deal_stages(id),
    client_id INTEGER REFERENCES clients(id),
    project_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(14, 2),
    currency VARCHAR(10) DEFAULT 'RUB',
    status VARCHAR(20) DEFAULT 'open',
    assigned_manager_id INTEGER,
    expected_close_date DATE,
    source VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    won_at TIMESTAMP,
    lost_at TIMESTAMP,
    lost_reason TEXT,
    created_by_user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deals_account_stage ON deals(account_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_manager ON deals(assigned_manager_id);

-- Технадзор: конструктор чек-листов — контрольные пункты как самостоятельная сущность
CREATE TABLE IF NOT EXISTS control_points (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    code VARCHAR(100),
    version VARCHAR(20) DEFAULT '1.0',
    status VARCHAR(20) DEFAULT 'draft',
    name VARCHAR(500) NOT NULL,
    description TEXT,
    section VARCHAR(255),
    subsection VARCHAR(255),
    check_type VARCHAR(50),
    criticality INTEGER DEFAULT 2,
    weight INTEGER DEFAULT 100,
    required BOOLEAN DEFAULT TRUE,
    normative_doc VARCHAR(255),
    normative_section VARCHAR(100),
    instruction TEXT,
    scheme JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    typical_defects JSONB DEFAULT '[]',
    text_templates JSONB DEFAULT '{}',
    report_settings JSONB DEFAULT '{}',
    publication JSONB DEFAULT '{}',
    versions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_control_points_account ON control_points(account_id);
CREATE INDEX IF NOT EXISTS idx_control_points_status ON control_points(status);

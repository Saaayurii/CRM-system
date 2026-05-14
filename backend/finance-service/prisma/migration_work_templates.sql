CREATE TABLE IF NOT EXISTS work_templates (
  id                  SERIAL PRIMARY KEY,
  account_id          INTEGER NOT NULL,
  name                VARCHAR(255) NOT NULL,
  code                VARCHAR(100),
  category            VARCHAR(100),
  description         TEXT,
  unit                VARCHAR(50),
  estimated_cost      DECIMAL(10,2),
  estimated_duration  INTEGER,
  complexity_level    INTEGER,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_templates_account_id ON work_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_work_templates_category ON work_templates(category);

ALTER TABLE proposal_lines
  ADD COLUMN IF NOT EXISTS work_template_id INTEGER REFERENCES work_templates(id);

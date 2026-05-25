-- material_calculations: stored calculator results (screed / warm floor / electrics / plaster / tile)
CREATE TABLE IF NOT EXISTS material_calculations (
  id                  SERIAL PRIMARY KEY,
  account_id          INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_id          INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_by_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  calculator_type     VARCHAR(50) NOT NULL,
  title               VARCHAR(255),
  inputs              JSONB NOT NULL DEFAULT '{}'::jsonb,
  results             JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings            JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes               TEXT,
  task_id             INTEGER,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS material_calculations_account_project_idx
  ON material_calculations(account_id, project_id);

CREATE INDEX IF NOT EXISTS material_calculations_account_type_idx
  ON material_calculations(account_id, calculator_type);

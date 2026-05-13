-- Warehouses table for equipment service
CREATE TABLE IF NOT EXISTS eq_warehouses (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  address    VARCHAR(500),
  account_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eq_warehouses_account_id ON eq_warehouses(account_id);

-- Add warehouseId to equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES eq_warehouses(id);
CREATE INDEX IF NOT EXISTS idx_equipment_warehouse_id ON equipment(warehouse_id);

-- Inventory sessions
CREATE TABLE IF NOT EXISTS inventory_sessions (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  project_id        INTEGER,
  account_id        INTEGER NOT NULL,
  status            INTEGER NOT NULL DEFAULT 0,
  scheduled_date    DATE,
  completed_date    DATE,
  created_by_user_id INTEGER,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_sessions_account_id ON inventory_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sessions_project_id ON inventory_sessions(project_id);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
  id                    SERIAL PRIMARY KEY,
  inventory_session_id  INTEGER NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  equipment_id          INTEGER NOT NULL REFERENCES equipment(id),
  warehouse_id          INTEGER REFERENCES eq_warehouses(id),
  expected_status       INTEGER,
  actual_status         INTEGER,
  is_found              BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

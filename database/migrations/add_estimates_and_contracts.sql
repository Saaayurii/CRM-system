-- ────────────────────────────────────────────────────────────────────────────
-- Расширение clients: подписант + полные адреса (для КС-2 и других форм)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS ogrn VARCHAR(20),
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS actual_address TEXT,
  ADD COLUMN IF NOT EXISTS signatory_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS signatory_position VARCHAR(255);

-- ────────────────────────────────────────────────────────────────────────────
-- projects.client_id — привязка проекта к Client (раньше был только текстовый clientName)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- ────────────────────────────────────────────────────────────────────────────
-- contracts — договор подряда (нужен для шапки КС-2: «Номер / Дата»)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  number VARCHAR(100) NOT NULL DEFAULT 'Б/Н',
  signed_date DATE,
  amount NUMERIC(15, 2),
  description TEXT,
  file_url VARCHAR(500),
  status INTEGER NOT NULL DEFAULT 1,  -- 0-draft, 1-active, 2-completed, 3-cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_account ON contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);

COMMENT ON TABLE contracts IS 'Договоры подряда — шапка для КС-2 и других актов';

-- ────────────────────────────────────────────────────────────────────────────
-- estimates — Смета. Привязана к проекту и (опционально) договору.
-- Поле article = "Работа" / "Черновые материалы" / "Чистовые материалы" / ...
-- Это позволяет иметь несколько смет на один проект (как в образцах — №71 и №72).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  article VARCHAR(100) NOT NULL DEFAULT 'Работа',  -- статья расходов
  doc_number VARCHAR(50),               -- внутренний номер документа (для КС-2)
  doc_date DATE,                        -- дата составления
  period_from DATE,                     -- отчётный период с
  period_to DATE,                       -- отчётный период по
  markup_percent NUMERIC(6, 2) DEFAULT 0,   -- наценка в %
  status INTEGER NOT NULL DEFAULT 0,    -- 0-draft, 1-active, 2-signed, 3-cancelled
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,   -- сумма без наценки (денормализация)
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estimates_account ON estimates(account_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_contract ON estimates(contract_id);

COMMENT ON TABLE estimates IS 'Смета (для генерации Сводного расчёта, КС-2, Акта приёмки)';

-- ────────────────────────────────────────────────────────────────────────────
-- estimate_sections — разделы сметы (например, «Восстановление основания пола»)
-- Каждый раздел можно подтвердить заказчиком отдельно (с датой подтверждения).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimate_sections (
  id SERIAL PRIMARY KEY,
  estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,    -- 0-draft, 1-confirmed
  confirmed_at DATE,                    -- дата подтверждения заказчиком
  section_date DATE,                    -- дата этапа (как в образце — «21.01.25», «11.02.25»)
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estimate_sections_estimate ON estimate_sections(estimate_id);

COMMENT ON TABLE estimate_sections IS 'Разделы сметы (этапы работ) с возможностью подтверждения заказчиком';

-- ────────────────────────────────────────────────────────────────────────────
-- estimate_items — позиции раздела сметы.
-- price_item_id — опциональная ссылка на price_items.id (если позиция взята из Прайса).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimate_items (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES estimate_sections(id) ON DELETE CASCADE,
  price_item_id INTEGER REFERENCES price_items(id) ON DELETE SET NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  unit VARCHAR(50),
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,   -- = quantity * unit_price (денормализация)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_section ON estimate_items(section_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_price_item ON estimate_items(price_item_id);

COMMENT ON TABLE estimate_items IS 'Позиции раздела сметы (взятые из Прайса или введённые вручную)';

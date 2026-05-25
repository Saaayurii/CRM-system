-- Прайс-лист компании: категории проектов (= колонки цен), категории прайса, позиции,
-- цены по категориям проектов. Поддержка унификации через price_items.parent_id.

-- Категории проектов (например: Квартира / Офис / Коммерческий объект)
-- На каждую категорию проекта приходится отдельная колонка цены.
CREATE TABLE IF NOT EXISTS price_project_categories (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_project_categories_account
  ON price_project_categories(account_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_price_project_categories_account_name
  ON price_project_categories(account_id, name);

COMMENT ON TABLE price_project_categories IS 'Категории проектов компании — формируют колонки цен в прайсе';

-- Категории внутри прайс-листа (например: Демонтаж / Электрика / Бурение)
CREATE TABLE IF NOT EXISTS price_categories (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_categories_account
  ON price_categories(account_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_price_categories_account_name
  ON price_categories(account_id, name);

COMMENT ON TABLE price_categories IS 'Категории прайс-листа компании';

-- Позиции прайса. parent_id указывает на «родительскую» позицию для модификаторов.
-- Например: «Бурение бетона круглое отверстие» — parent_id = NULL.
--           «180 мм»  — parent_id = <id предыдущей>
--           «230 мм»  — parent_id = <id предыдущей>
-- Себестоимость и описание копировать необязательно — модификатор может только отличаться ценой/именем.
CREATE TABLE IF NOT EXISTS price_items (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES price_categories(id) ON DELETE SET NULL,
  parent_id INTEGER REFERENCES price_items(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  unit VARCHAR(50),
  cost NUMERIC(14,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_items_account ON price_items(account_id);
CREATE INDEX IF NOT EXISTS idx_price_items_category ON price_items(category_id);
CREATE INDEX IF NOT EXISTS idx_price_items_parent ON price_items(parent_id);

COMMENT ON TABLE price_items IS 'Позиции прайс-листа. parent_id — для модификаторов (унификация)';

-- Цена позиции по конкретной категории проекта.
CREATE TABLE IF NOT EXISTS price_item_prices (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES price_items(id) ON DELETE CASCADE,
  project_category_id INTEGER NOT NULL REFERENCES price_project_categories(id) ON DELETE CASCADE,
  price NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_price_item_prices_item_category
  ON price_item_prices(item_id, project_category_id);

CREATE INDEX IF NOT EXISTS idx_price_item_prices_item ON price_item_prices(item_id);
CREATE INDEX IF NOT EXISTS idx_price_item_prices_project_category ON price_item_prices(project_category_id);

COMMENT ON TABLE price_item_prices IS 'Цена позиции прайса для конкретной категории проекта';

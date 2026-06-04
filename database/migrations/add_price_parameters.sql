-- Параметрические услуги в прайсе: «1 услуга → множество позиций».
-- Услуга (price_items) получает набор параметров (групп модификаторов). Каждый параметр имеет
-- значения, каждое значение влияет на цену (коэффициент / доплата). Итоговая цена считается по
-- формуле:  Цена = (Базовая × Πкоэффициентов) + Σдоплат, с округлением.
--
-- Параметры хранятся в общей библиотеке аккаунта (price_parameters / price_parameter_values) и
-- копируются в конкретную услугу как группы (price_item_param_groups / price_item_param_options),
-- где коэффициенты правятся локально, не затрагивая библиотеку и другие услуги.

-- ── Расширение price_items ──────────────────────────────────────────────────
ALTER TABLE price_items
  ADD COLUMN IF NOT EXISTS base_price   NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS status       VARCHAR(20)  NOT NULL DEFAULT 'active',  -- draft | active
  ADD COLUMN IF NOT EXISTS calc_method  VARCHAR(20)  NOT NULL DEFAULT 'columns', -- columns | formula
  ADD COLUMN IF NOT EXISTS rounding     INTEGER      NOT NULL DEFAULT 0;          -- округление до N ₽ (0 = нет)

COMMENT ON COLUMN price_items.calc_method IS 'columns = цены по колонкам категорий проектов; formula = base_price × коэфф + доплаты';

-- ── Справочник единиц измерения ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_units (
  id          SERIAL PRIMARY KEY,
  account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  short_name  VARCHAR(30),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_units_account ON price_units(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_price_units_account_name ON price_units(account_id, name);
COMMENT ON TABLE price_units IS 'Справочник единиц измерения для прайса';

-- ── Библиотека параметров (общая по аккаунту) ───────────────────────────────
CREATE TABLE IF NOT EXISTS price_parameters (
  id             SERIAL PRIMARY KEY,
  account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  selection_type VARCHAR(10) NOT NULL DEFAULT 'single', -- single | multi
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_parameters_account ON price_parameters(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_price_parameters_account_name ON price_parameters(account_id, name);
COMMENT ON TABLE price_parameters IS 'Библиотека параметров (модификаторов) прайса, переиспользуемых в услугах';

CREATE TABLE IF NOT EXISTS price_parameter_values (
  id              SERIAL PRIMARY KEY,
  parameter_id    INTEGER NOT NULL REFERENCES price_parameters(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  influence_type  VARCHAR(12) NOT NULL DEFAULT 'coefficient', -- coefficient | surcharge | none
  influence_value NUMERIC(14,4) NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_parameter_values_parameter ON price_parameter_values(parameter_id);
COMMENT ON TABLE price_parameter_values IS 'Значения параметров библиотеки (с коэффициентом/доплатой по умолчанию)';

-- ── Группы параметров услуги (копии, правятся локально) ──────────────────────
CREATE TABLE IF NOT EXISTS price_item_param_groups (
  id                  SERIAL PRIMARY KEY,
  item_id             INTEGER NOT NULL REFERENCES price_items(id) ON DELETE CASCADE,
  source_parameter_id INTEGER REFERENCES price_parameters(id) ON DELETE SET NULL,
  name                VARCHAR(255) NOT NULL,
  selection_type      VARCHAR(10) NOT NULL DEFAULT 'single', -- single | multi
  is_required         BOOLEAN NOT NULL DEFAULT TRUE,
  affects_price       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_item_param_groups_item ON price_item_param_groups(item_id);
CREATE INDEX IF NOT EXISTS idx_price_item_param_groups_source ON price_item_param_groups(source_parameter_id);
COMMENT ON TABLE price_item_param_groups IS 'Группы параметров конкретной услуги (копия из библиотеки, редактируется локально)';

CREATE TABLE IF NOT EXISTS price_item_param_options (
  id              SERIAL PRIMARY KEY,
  group_id        INTEGER NOT NULL REFERENCES price_item_param_groups(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  influence_type  VARCHAR(12) NOT NULL DEFAULT 'coefficient', -- coefficient | surcharge | none
  influence_value NUMERIC(14,4) NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_item_param_options_group ON price_item_param_options(group_id);
COMMENT ON TABLE price_item_param_options IS 'Варианты значений параметра услуги с влиянием на цену';

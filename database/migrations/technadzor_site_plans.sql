-- Технадзор: планы/чертежи объекта с разметкой дефектов пинами (как в PlanRadar)
CREATE TABLE IF NOT EXISTS site_plans (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER,
    construction_site_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_by_user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_plans_account ON site_plans(account_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_site_plans_project ON site_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_site_plans_site ON site_plans(construction_site_id);

-- Привязка дефекта к плану (координата пина лежит в defects.coordinates как { x, y })
ALTER TABLE defects ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES site_plans(id);
CREATE INDEX IF NOT EXISTS idx_defects_plan ON defects(plan_id);

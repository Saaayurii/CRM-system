-- Learning Library extensions: mandatory training, role targeting, test linkage
-- Safe to re-run (uses IF NOT EXISTS).

-- 1. training_materials: обязательное обучение + назначение по ролям
ALTER TABLE training_materials
    ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE;

ALTER TABLE training_materials
    ADD COLUMN IF NOT EXISTS target_role_ids JSONB DEFAULT '[]';

ALTER TABLE training_materials
    ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_training_materials_mandatory
    ON training_materials(account_id, is_mandatory);

-- 2. knowledge_tests: привязка к обучающему материалу
ALTER TABLE knowledge_tests
    ADD COLUMN IF NOT EXISTS training_material_id INTEGER REFERENCES training_materials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_tests_material
    ON knowledge_tests(training_material_id);

-- 3. training_progress: чтобы фронт смог фильтровать просто
CREATE INDEX IF NOT EXISTS idx_training_progress_user_status
    ON training_progress(user_id, progress_percentage);

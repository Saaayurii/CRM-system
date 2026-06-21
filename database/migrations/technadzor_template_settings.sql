-- Технадзор: настройки шаблона инспекции (требовать фото, авто-создавать дефекты,
-- вес для рейтинга, объект применения, доступ по ролям и т.п.)
ALTER TABLE inspection_checklist_templates
    ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

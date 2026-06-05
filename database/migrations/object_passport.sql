-- ============================================================
-- Object Technical Passport (Технический паспорт объекта)
-- Adds two JSONB columns to construction_sites:
--   * passport          — structured passport blob (general/access/engineering/...)
--   * passport_history  — append-only array of change-history entries (capped at 200)
-- Idempotent: safe to re-run.
-- ============================================================

ALTER TABLE construction_sites
  ADD COLUMN IF NOT EXISTS passport JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS passport_history JSONB NOT NULL DEFAULT '[]'::jsonb;

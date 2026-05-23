-- ФИО и должность руководителя/главбуха из ЕГРЮЛ (когда нет матча с users)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS director_name_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS director_position VARCHAR(255),
  ADD COLUMN IF NOT EXISTS accountant_name_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS accountant_position VARCHAR(255);

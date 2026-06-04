-- Сохранение выбранных значений параметров для строки сметы, созданной из параметрической услуги.
-- Позволяет повторно открывать/редактировать строку и пересчитывать цену.
ALTER TABLE estimate_items
  ADD COLUMN IF NOT EXISTS selected_options JSONB;

COMMENT ON COLUMN estimate_items.selected_options IS 'Выбранные значения параметров услуги: [{groupId, groupName, optionId, optionName, influenceType, influenceValue}]';

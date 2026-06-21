-- Технадзор: тестовые дефекты для проверки карточки/списка.
-- Берёт account_id/project_id/inspection_id из первой инспекции в БД — FK и аккаунт
-- гарантированно согласованы. Безопасно повторять: ON CONFLICT по defect_number ничего не делает.
-- Удалить: DELETE FROM defects WHERE defect_number LIKE 'DEF-TEST-%';

WITH ins AS (SELECT id, account_id, project_id FROM inspections ORDER BY id LIMIT 1)
INSERT INTO defects
  (account_id, project_id, inspection_id, defect_number, defect_type, category,
   severity, title, description, location_description, status,
   reported_date, due_date, photos, documents)
SELECT i.account_id, i.project_id, i.id,
       v.defect_number, 'quality', v.category, v.severity, v.title, v.description,
       v.loc, v.status, CURRENT_DATE - 6, CURRENT_DATE - 2, v.photos::jsonb, '[]'::jsonb
FROM ins i CROSS JOIN (VALUES
  ('DEF-TEST-001','Оконные конструкции',4,'Скол в нижнем левом углу стеклопакета','Скол ~3 мм в нижнем левом углу стеклопакета.','Кв. 125 / Окно W-01',2,'["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900"]'),
  ('DEF-TEST-002','Отделка',2,'Отсутствие герметика на внешнем шве','Шов без герметизации на участке ~0.5 м.','Кв. 125 / Балкон',0,'[]'),
  ('DEF-TEST-003','Отделка',1,'Царапины на подоконнике','Поверхностные царапины на подоконнике.','Кв. 126 / Окно W-03',3,'[]')
) AS v(defect_number, category, severity, title, description, loc, status, photos)
ON CONFLICT (defect_number) DO NOTHING;

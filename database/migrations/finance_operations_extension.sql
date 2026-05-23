-- Финансовый контур: расширение таблицы payments
-- direction: 'income' | 'expense'
-- sub_type: для income — 'advance' | 'payment' | 'refund'; для expense — 'bill' | 'material' | 'advance_disbursement' | 'payroll'
-- cash_location: 'hand' | 'company'  (на руки/наличные vs на р/с фирмы)
-- bank_name: при cash_location='company' — название банка
-- document_type: одна буква, кодирует тип документа (П=поступление, А=аванс, В=возврат, С=счёт, М=материал, Д=авансирование, Р=расчёт)
-- payment_datetime: дата+время операции (по умолчанию now)
-- construction_site_id: привязка к объекту строительства

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS direction VARCHAR(20),
    ADD COLUMN IF NOT EXISTS sub_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cash_location VARCHAR(20),
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS document_type VARCHAR(10),
    ADD COLUMN IF NOT EXISTS payment_datetime TIMESTAMP,
    ADD COLUMN IF NOT EXISTS construction_site_id INTEGER REFERENCES construction_sites(id);

-- Снимаем UNIQUE с payment_number и снова добавляем как unique per (account_id, payment_number),
-- чтобы автонумерация работала в рамках компании, а не глобально.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_payment_number_key'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT payments_payment_number_key;
    END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_account_payment_number_key
    ON payments (account_id, payment_number);

-- Бэкфил для существующих записей: проставим direction по payment_type, datetime = payment_date.
UPDATE payments
SET direction = CASE
        WHEN LOWER(COALESCE(payment_type, '')) = 'income' THEN 'income'
        WHEN LOWER(COALESCE(payment_type, '')) = 'expense' THEN 'expense'
        ELSE direction
    END
WHERE direction IS NULL;

UPDATE payments
SET payment_datetime = payment_date::timestamp
WHERE payment_datetime IS NULL AND payment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_direction ON payments(direction);
CREATE INDEX IF NOT EXISTS idx_payments_construction_site ON payments(construction_site_id);
CREATE INDEX IF NOT EXISTS idx_payments_datetime ON payments(payment_datetime DESC);

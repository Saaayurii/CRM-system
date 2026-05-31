-- ==========================================
-- Строительная ВИКИ — нормативная база (СНИП / ГОСТ / СП)
-- Глобальная: контент общий для всех аккаунтов, правит super_admin
-- Idempotent: безопасно запускать повторно.
-- ==========================================

CREATE TABLE IF NOT EXISTS norm_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    icon VARCHAR(64),
    parent_id INTEGER REFERENCES norm_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_norm_categories_parent ON norm_categories(parent_id);

CREATE TABLE IF NOT EXISTS norm_documents (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES norm_categories(id) ON DELETE SET NULL,

    doc_type VARCHAR(32) NOT NULL DEFAULT 'other',
    code VARCHAR(120),
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    content TEXT,

    status VARCHAR(32) NOT NULL DEFAULT 'active',
    effective_date DATE,
    superseded_date DATE,
    superseded_by_id INTEGER REFERENCES norm_documents(id) ON DELETE SET NULL,

    tags JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    related_ids JSONB DEFAULT '[]',
    keywords TEXT,

    view_count INTEGER DEFAULT 0,
    created_by_user_id INTEGER REFERENCES users(id),
    updated_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_norm_documents_category ON norm_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_norm_documents_type ON norm_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_norm_documents_status ON norm_documents(status);

CREATE TABLE IF NOT EXISTS norm_bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES norm_documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_norm_bookmarks_user ON norm_bookmarks(user_id);

-- Стартовый набор корневых категорий (создаётся только если таблица пуста)
INSERT INTO norm_categories (name, slug, icon, sort_order)
SELECT * FROM (VALUES
    ('СНиПы (строительные нормы и правила)', 'snip', '📐', 10),
    ('ГОСТы (государственные стандарты)', 'gost', '📏', 20),
    ('СП (своды правил)', 'sp', '📋', 30),
    ('Региональные нормы', 'regional', '🗺️', 40),
    ('Безопасность и охрана труда', 'safety', '⛑️', 50)
) AS seed(name, slug, icon, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM norm_categories);

-- Технадзор: комментарии к дефектам
CREATE TABLE IF NOT EXISTS defect_comments (
    id SERIAL PRIMARY KEY,
    defect_id INTEGER NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL,
    user_id INTEGER,
    user_name VARCHAR(255),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_defect_comments_defect ON defect_comments(defect_id);

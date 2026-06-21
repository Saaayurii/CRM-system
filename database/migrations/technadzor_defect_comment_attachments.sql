-- Технадзор: вложения и голосовые заметки в комментариях к дефектам
ALTER TABLE defect_comments
    ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- текст больше не обязателен (комментарий может быть только голосовым/файлом)
ALTER TABLE defect_comments
    ALTER COLUMN comment_text SET DEFAULT '';

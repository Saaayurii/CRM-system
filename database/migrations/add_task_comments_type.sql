-- Add `type` column to task_comments to distinguish user vs system messages
-- (system messages = automatic notifications from subtask status changes)

ALTER TABLE task_comments
  ADD COLUMN IF NOT EXISTS type VARCHAR(16) NOT NULL DEFAULT 'user';

-- Backfill: any existing comments with text starting with '__system__:' become system type
UPDATE task_comments
SET type = 'system',
    comment_text = SUBSTRING(comment_text FROM 11)
WHERE comment_text LIKE '__system__:%';

ALTER TABLE chat_channel_members
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_pinned
  ON chat_channel_members(user_id, is_pinned) WHERE is_pinned = TRUE;

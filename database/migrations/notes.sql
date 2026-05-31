-- Sticky notes / personal reminders (notifications-service)
-- Per-user notes that can pop up as a reminder modal on a chosen day.
-- A note becomes "due" when remind_at <= now() and dismissed_at IS NULL.
-- Dismissing sets dismissed_at (moves it to history); it can be restored.

CREATE TABLE IF NOT EXISTS notes (
    id           SERIAL PRIMARY KEY,
    account_id   INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    title        VARCHAR(255),
    content      TEXT NOT NULL,
    color        VARCHAR(20) NOT NULL DEFAULT 'yellow',
    remind_at    TIMESTAMP,
    dismissed_at TIMESTAMP,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes (user_id);
CREATE INDEX IF NOT EXISTS notes_remind_at_idx ON notes (remind_at);

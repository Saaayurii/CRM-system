-- Migration: Push Subscriptions table for Web Push (PWA)
-- Run: psql -U postgres -d crm_db < database/migrations/001_push_subscriptions.sql

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role_id     INTEGER,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        VARCHAR(255) NOT NULL,
    user_agent  VARCHAR(500),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id    ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_account_id ON push_subscriptions(account_id);

-- Web Push subscriptions (notifications-service)
-- Stores browser/PWA push endpoints so the backend can deliver Web Push
-- notifications to a phone/desktop even when the app is closed.

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id  INTEGER NOT NULL,
    role_id     INTEGER,
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        VARCHAR(255) NOT NULL,
    user_agent  VARCHAR(500),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_id_endpoint_key
    ON push_subscriptions (user_id, endpoint);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
    ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_account_id_idx
    ON push_subscriptions (account_id);

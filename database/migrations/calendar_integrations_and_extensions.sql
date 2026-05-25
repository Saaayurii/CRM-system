-- Calendar module: external integrations + variability extensions
-- 1) Extend calendar_events with source, external and visual fields

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS source_type        VARCHAR(30)  DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id          INTEGER,
  ADD COLUMN IF NOT EXISTS external_id        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS external_provider  VARCHAR(30),
  ADD COLUMN IF NOT EXISTS external_etag      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS integration_id     INTEGER,
  ADD COLUMN IF NOT EXISTS color_hex          VARCHAR(9),
  ADD COLUMN IF NOT EXISTS visibility         VARCHAR(20)  DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS user_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS synced_at          TIMESTAMP,
  ADD COLUMN IF NOT EXISTS custom_type_id     INTEGER,
  ADD COLUMN IF NOT EXISTS extra              JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_calendar_events_source        ON calendar_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_external      ON calendar_events(external_provider, external_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user          ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_account_range ON calendar_events(account_id, start_datetime);

-- 2) Custom event types (per-account variability)

CREATE TABLE IF NOT EXISTS calendar_custom_event_types (
    id          SERIAL PRIMARY KEY,
    account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    code        VARCHAR(60) NOT NULL,
    name        VARCHAR(120) NOT NULL,
    color_hex   VARCHAR(9) DEFAULT '#3b82f6',
    icon        VARCHAR(60),
    is_active   BOOLEAN DEFAULT TRUE,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, code)
);

CREATE INDEX IF NOT EXISTS idx_calendar_custom_types_account ON calendar_custom_event_types(account_id);

-- 3) External calendar integrations (per-user)

CREATE TABLE IF NOT EXISTS calendar_integrations (
    id                   SERIAL PRIMARY KEY,
    account_id           INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider             VARCHAR(30) NOT NULL, -- google | yandex | apple
    display_name         VARCHAR(255),
    external_account     VARCHAR(255),         -- email/login pokazyvaemoe v UI
    -- OAuth (Google)
    access_token         TEXT,
    refresh_token        TEXT,
    token_expires_at     TIMESTAMP,
    scope                TEXT,
    -- CalDAV (Yandex/Apple)
    caldav_url           VARCHAR(255),
    caldav_username      VARCHAR(255),
    caldav_password_enc  TEXT,                 -- AES-encrypted app-password
    -- Sync state
    external_calendar_id VARCHAR(255),
    sync_token           TEXT,
    sync_direction       VARCHAR(20) DEFAULT 'bidirectional', -- pull | push | bidirectional
    last_sync_at         TIMESTAMP,
    last_sync_status     VARCHAR(20),
    last_sync_error      TEXT,
    webhook_channel_id   VARCHAR(255),
    webhook_resource_id  VARCHAR(255),
    webhook_expiration   TIMESTAMP,
    is_active            BOOLEAN DEFAULT TRUE,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, provider, external_account)
);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_acc  ON calendar_integrations(account_id);

-- 4) FK link integration_id -> calendar_integrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_events_integration_id_fkey'
  ) THEN
    ALTER TABLE calendar_events
      ADD CONSTRAINT calendar_events_integration_id_fkey
      FOREIGN KEY (integration_id) REFERENCES calendar_integrations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'calendar_events_custom_type_id_fkey'
  ) THEN
    ALTER TABLE calendar_events
      ADD CONSTRAINT calendar_events_custom_type_id_fkey
      FOREIGN KEY (custom_type_id) REFERENCES calendar_custom_event_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5) Seed system event types as comment reference (NOT inserted):
-- meeting, deadline, milestone, inspection, delivery, time_off, attendance, training, payment, custom

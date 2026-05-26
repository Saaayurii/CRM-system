-- HSE module + Safety Briefings journal
-- Safe to re-run (uses IF NOT EXISTS / DO blocks).

-- ============================================================
-- 1. SAFETY BRIEFINGS (hr-service): Журнал инструктажей
-- ============================================================

CREATE TABLE IF NOT EXISTS safety_briefings (
    id                  SERIAL PRIMARY KEY,
    account_id          INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    briefing_type       VARCHAR(40) NOT NULL,
        -- introductory | primary | repeat | targeted | unscheduled
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    project_id          INTEGER,
    construction_site_id INTEGER,
    instructor_id       INTEGER,
    instructor_name     VARCHAR(255),
    scheduled_at        TIMESTAMP,
    conducted_at        TIMESTAMP,
    location            VARCHAR(255),
    duration_minutes    INTEGER,
    validity_months     INTEGER DEFAULT 6,
    status              VARCHAR(30) DEFAULT 'planned',
        -- planned | in_progress | completed | cancelled
    materials           JSONB DEFAULT '[]'::jsonb,
        -- [{name, url, type}]
    notes               TEXT,
    created_by_user_id  INTEGER,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_safety_briefings_account
    ON safety_briefings(account_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_safety_briefings_project
    ON safety_briefings(project_id);
CREATE INDEX IF NOT EXISTS idx_safety_briefings_status
    ON safety_briefings(account_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_briefings_type
    ON safety_briefings(account_id, briefing_type);

CREATE TABLE IF NOT EXISTS safety_briefing_topics (
    id           SERIAL PRIMARY KEY,
    briefing_id  INTEGER NOT NULL REFERENCES safety_briefings(id) ON DELETE CASCADE,
    topic        VARCHAR(500) NOT NULL,
    description  TEXT,
    sort_order   INTEGER DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_safety_briefing_topics_briefing
    ON safety_briefing_topics(briefing_id);

CREATE TABLE IF NOT EXISTS safety_briefing_participants (
    id              SERIAL PRIMARY KEY,
    briefing_id     INTEGER NOT NULL REFERENCES safety_briefings(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL,
    user_name       VARCHAR(255),
    user_position   VARCHAR(255),
    status          VARCHAR(30) DEFAULT 'invited',
        -- invited | signed | absent | refused
    signed_at       TIMESTAMP,
    signature_data  TEXT, -- base64 PNG из canvas
    signature_ip    VARCHAR(64),
    notes           TEXT,
    valid_until     DATE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (briefing_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_safety_briefing_participants_briefing
    ON safety_briefing_participants(briefing_id);
CREATE INDEX IF NOT EXISTS idx_safety_briefing_participants_user
    ON safety_briefing_participants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_briefing_participants_valid
    ON safety_briefing_participants(user_id, valid_until);

-- ============================================================
-- 2. HSE: Реестр рисков (inspections-service)
-- ============================================================

CREATE TABLE IF NOT EXISTS hse_risks (
    id                    SERIAL PRIMARY KEY,
    account_id            INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    project_id            INTEGER,
    construction_site_id  INTEGER,
    risk_code             VARCHAR(50),
    category              VARCHAR(100),
        -- height | electrical | fire | chemical | mechanical | environmental | ergonomic | other
    hazard_source         VARCHAR(255),
    title                 VARCHAR(255) NOT NULL,
    description           TEXT,
    likelihood            INTEGER DEFAULT 1,    -- 1..5
    severity              INTEGER DEFAULT 1,    -- 1..5
    risk_level            VARCHAR(20),          -- low | medium | high | critical (вычисляется фронтом)
    control_measures      TEXT,
    responsible_user_id   INTEGER,
    status                VARCHAR(30) DEFAULT 'identified',
        -- identified | mitigated | accepted | closed
    identified_at         DATE DEFAULT CURRENT_DATE,
    review_date           DATE,
    last_reviewed_at      DATE,
    attachments           JSONB DEFAULT '[]'::jsonb,
    created_by_user_id    INTEGER,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hse_risks_account ON hse_risks(account_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hse_risks_project ON hse_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_hse_risks_status ON hse_risks(account_id, status);

-- ============================================================
-- 3. HSE: Инциденты / несчастные случаи
-- ============================================================

CREATE TABLE IF NOT EXISTS hse_incidents (
    id                    SERIAL PRIMARY KEY,
    account_id            INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    incident_number       VARCHAR(50),
    project_id            INTEGER,
    construction_site_id  INTEGER,
    incident_type         VARCHAR(50) NOT NULL,
        -- near_miss | minor_injury | serious_injury | fatality | property_damage | environmental | fire
    severity              VARCHAR(20) DEFAULT 'medium',
        -- low | medium | high | critical
    occurred_at           TIMESTAMP NOT NULL,
    location              VARCHAR(255),
    description           TEXT NOT NULL,
    victim_user_id        INTEGER,
    victim_name           VARCHAR(255),
    victim_position       VARCHAR(255),
    reported_by_user_id   INTEGER,
    witnesses             JSONB DEFAULT '[]'::jsonb,
        -- [{userId, name, statement}]
    immediate_actions     TEXT,
    root_cause            TEXT,
    investigation_status  VARCHAR(30) DEFAULT 'new',
        -- new | investigating | completed | closed
    days_lost             INTEGER,
    estimated_cost        DECIMAL(14,2),
    attachments           JSONB DEFAULT '[]'::jsonb,
        -- [{name, url, type}]
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hse_incidents_account ON hse_incidents(account_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hse_incidents_project ON hse_incidents(project_id);
CREATE INDEX IF NOT EXISTS idx_hse_incidents_type ON hse_incidents(account_id, incident_type);
CREATE INDEX IF NOT EXISTS idx_hse_incidents_occurred ON hse_incidents(occurred_at);

-- ============================================================
-- 4. HSE: Наряды-допуски (work permits)
-- ============================================================

CREATE TABLE IF NOT EXISTS hse_permits (
    id                    SERIAL PRIMARY KEY,
    account_id            INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    permit_number         VARCHAR(50),
    permit_type           VARCHAR(50) NOT NULL,
        -- hot_work | confined_space | work_at_height | electrical | excavation | lifting | other
    project_id            INTEGER,
    construction_site_id  INTEGER,
    work_description      TEXT NOT NULL,
    location              VARCHAR(255),
    requested_by_user_id  INTEGER,
    approved_by_user_id   INTEGER,
    workers               JSONB DEFAULT '[]'::jsonb,
        -- [{userId, name}]
    hazards               JSONB DEFAULT '[]'::jsonb,
        -- string[]
    control_measures      TEXT,
    ppe_required          JSONB DEFAULT '[]'::jsonb,
        -- string[]
    valid_from            TIMESTAMP NOT NULL,
    valid_until           TIMESTAMP NOT NULL,
    status                VARCHAR(30) DEFAULT 'draft',
        -- draft | pending_approval | approved | active | expired | revoked | completed
    approved_at           TIMESTAMP,
    closed_at             TIMESTAMP,
    closing_notes         TEXT,
    attachments           JSONB DEFAULT '[]'::jsonb,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hse_permits_account ON hse_permits(account_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hse_permits_project ON hse_permits(project_id);
CREATE INDEX IF NOT EXISTS idx_hse_permits_status ON hse_permits(account_id, status);
CREATE INDEX IF NOT EXISTS idx_hse_permits_valid ON hse_permits(valid_until);

-- ============================================================
-- 5. HSE: Нарушения техники безопасности
-- ============================================================

CREATE TABLE IF NOT EXISTS hse_violations (
    id                    SERIAL PRIMARY KEY,
    account_id            INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    project_id            INTEGER,
    construction_site_id  INTEGER,
    observed_by_user_id   INTEGER,
    violator_user_id      INTEGER,
    violator_name         VARCHAR(255),
    contractor_id         INTEGER,
    category              VARCHAR(100),
        -- ppe | unsafe_act | unsafe_condition | procedure | housekeeping | other
    description           TEXT NOT NULL,
    severity              VARCHAR(20) DEFAULT 'medium',
        -- low | medium | high | critical
    observed_at           TIMESTAMP NOT NULL,
    location              VARCHAR(255),
    photos                JSONB DEFAULT '[]'::jsonb,
    status                VARCHAR(30) DEFAULT 'open',
        -- open | acknowledged | corrected | closed | dismissed
    corrective_action     TEXT,
    deadline              DATE,
    resolved_at           TIMESTAMP,
    resolution_notes      TEXT,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hse_violations_account ON hse_violations(account_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hse_violations_project ON hse_violations(project_id);
CREATE INDEX IF NOT EXISTS idx_hse_violations_status ON hse_violations(account_id, status);
CREATE INDEX IF NOT EXISTS idx_hse_violations_violator ON hse_violations(violator_user_id);

-- ============================================================
-- 6. HSE: Корректирующие меры
-- ============================================================

CREATE TABLE IF NOT EXISTS hse_corrective_actions (
    id                    SERIAL PRIMARY KEY,
    account_id            INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    source_type           VARCHAR(30),
        -- incident | violation | inspection | risk | other
    source_id             INTEGER,
    project_id            INTEGER,
    construction_site_id  INTEGER,
    title                 VARCHAR(255) NOT NULL,
    description           TEXT,
    assigned_to_user_id   INTEGER,
    assigned_by_user_id   INTEGER,
    priority              VARCHAR(20) DEFAULT 'medium',
        -- low | medium | high | critical
    due_date              DATE,
    status                VARCHAR(30) DEFAULT 'open',
        -- open | in_progress | completed | cancelled | overdue
    completed_at          TIMESTAMP,
    completion_notes      TEXT,
    attachments           JSONB DEFAULT '[]'::jsonb,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hse_corrective_actions_account ON hse_corrective_actions(account_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_hse_corrective_actions_assignee ON hse_corrective_actions(assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_hse_corrective_actions_source ON hse_corrective_actions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_hse_corrective_actions_due ON hse_corrective_actions(due_date, status);

-- ============================================================
-- 7. HSE: Мониторинг критических условий
-- ============================================================

CREATE TABLE IF NOT EXISTS hse_monitoring (
    id                    SERIAL PRIMARY KEY,
    account_id            INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    project_id            INTEGER,
    construction_site_id  INTEGER,
    parameter_type        VARCHAR(50) NOT NULL,
        -- temperature | wind_speed | humidity | gas_level | noise_level | electrical | fire_alarm | dust | other
    parameter_label       VARCHAR(100),
    value                 DECIMAL(14,4),
    value_text            VARCHAR(255),
    unit                  VARCHAR(50),
    threshold_min         DECIMAL(14,4),
    threshold_max         DECIMAL(14,4),
    status                VARCHAR(20) DEFAULT 'normal',
        -- normal | warning | critical
    measured_at           TIMESTAMP NOT NULL,
    measured_by_user_id   INTEGER,
    notes                 TEXT,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hse_monitoring_account ON hse_monitoring(account_id);
CREATE INDEX IF NOT EXISTS idx_hse_monitoring_project ON hse_monitoring(project_id);
CREATE INDEX IF NOT EXISTS idx_hse_monitoring_measured ON hse_monitoring(measured_at);
CREATE INDEX IF NOT EXISTS idx_hse_monitoring_status ON hse_monitoring(account_id, status, measured_at DESC);

-- ============================================================
-- 8. tasks: requires_briefing_types для предупреждения в UI
-- ============================================================

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS requires_briefing_types JSONB DEFAULT '[]'::jsonb;

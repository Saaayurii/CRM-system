-- Wiki Editor: blocks storage, version history, draft moderation workflow
-- Applied: 2026-05-31

-- Extend wiki_pages with blocks JSON column
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]';

-- Version history snapshots (immutable)
CREATE TABLE IF NOT EXISTS wiki_page_versions (
  id              SERIAL PRIMARY KEY,
  wiki_page_id    INTEGER NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  version_num     INTEGER NOT NULL DEFAULT 1,
  title           VARCHAR(255) NOT NULL,
  blocks          JSONB NOT NULL DEFAULT '[]',
  change_note     TEXT,
  created_by_user_id INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wiki_page_id, version_num)
);

-- Drafts with moderation workflow (draft → pending → approved|rejected)
CREATE TABLE IF NOT EXISTS wiki_page_drafts (
  id              SERIAL PRIMARY KEY,
  wiki_page_id    INTEGER REFERENCES wiki_pages(id) ON DELETE CASCADE,
  account_id      INTEGER NOT NULL,
  title           VARCHAR(255) NOT NULL,
  category        VARCHAR(100),
  parent_page_id  INTEGER REFERENCES wiki_pages(id) ON DELETE SET NULL,
  tags            JSONB DEFAULT '[]',
  blocks          JSONB NOT NULL DEFAULT '[]',
  status          VARCHAR(32) NOT NULL DEFAULT 'draft',
  author_id       INTEGER NOT NULL,
  reviewer_id     INTEGER,
  review_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Moderation comments
CREATE TABLE IF NOT EXISTS wiki_draft_comments (
  id          SERIAL PRIMARY KEY,
  draft_id    INTEGER NOT NULL REFERENCES wiki_page_drafts(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_versions_page_id ON wiki_page_versions(wiki_page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_drafts_account_id ON wiki_page_drafts(account_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_drafts_status ON wiki_page_drafts(status);
CREATE INDEX IF NOT EXISTS idx_wiki_page_drafts_author_id ON wiki_page_drafts(author_id);
CREATE INDEX IF NOT EXISTS idx_wiki_draft_comments_draft_id ON wiki_draft_comments(draft_id);

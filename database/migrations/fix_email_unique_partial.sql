-- Fix email uniqueness: allow reusing email of soft-deleted users
-- Drop the global unique constraint created by Prisma
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Partial unique index: only active (non-deleted) users must have unique email
CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_unique
  ON users(email) WHERE deleted_at IS NULL;

-- Prevent duplicate pending registration requests for the same email per account
CREATE UNIQUE INDEX IF NOT EXISTS reg_requests_pending_email_unique
  ON registration_requests(email, account_id) WHERE status = 0;

-- Obfuscate emails of users deleted BEFORE the softDeleteWithEmail fix was deployed.
-- This frees their original email addresses for re-registration.
UPDATE users
SET email = CONCAT('deleted_', id, '_', EXTRACT(EPOCH FROM deleted_at)::bigint, '@crm.deleted')
WHERE deleted_at IS NOT NULL
  AND email NOT LIKE 'deleted_%@crm.deleted';

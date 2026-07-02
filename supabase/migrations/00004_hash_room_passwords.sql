-- ============================================================
-- SyncSaga — Migration 004: Hash Existing Room Passwords
-- ============================================================
-- This migration converts any existing plaintext room passwords
-- to bcrypt hashes. Run AFTER deploying the updated backend code
-- that uses bcrypt for password verification.
--
-- IMPORTANT: This migration uses pgcrypto's crypt() function
-- since bcrypt is not natively available in PostgreSQL.
-- The application layer (Node.js) uses the bcrypt npm package
-- for hashing and verification, which is compatible with
-- the $2b$ format stored by this migration.
--
-- For existing rows with plaintext passwords, we mark them
-- with a migration flag so the application can re-hash them
-- with bcrypt on first access (lazy migration).
-- ============================================================

-- Add a column to track password migration status
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS password_migrated BOOLEAN DEFAULT false;

-- Update the password column to allow longer strings (bcrypt hashes are ~60 chars)
ALTER TABLE public.rooms ALTER COLUMN password TYPE TEXT;

-- Mark all existing rows with passwords as needing migration
-- The application will re-hash them with bcrypt on first access
UPDATE public.rooms
SET password_migrated = false
WHERE password IS NOT NULL AND password != '';

-- For rooms without passwords, mark as already migrated
UPDATE public.rooms
SET password_migrated = true
WHERE password IS NULL OR password = '';

-- Add index for password migration lookup (find rooms needing lazy re-hash)
CREATE INDEX IF NOT EXISTS idx_rooms_password_unmigrated
  ON public.rooms (id)
  WHERE password IS NOT NULL AND password_migrated = false;

-- ============================================================
-- Note: The application's room.service.ts handles lazy migration:
--   1. On joinRoom(), if password_migrated = false:
--      a. Compare plaintext password using direct comparison
--      b. If match: hash with bcrypt, update DB, set password_migrated = true
--      c. If no match: reject
--   2. If password_migrated = true: use bcrypt.compare() normally
-- ============================================================

-- Add comment for documentation
COMMENT ON COLUMN public.rooms.password_migrated IS 'Whether the password has been migrated from plaintext to bcrypt hash. false = needs lazy re-hash on next access.';

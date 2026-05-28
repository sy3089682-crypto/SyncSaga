-- SyncSaga Rollback 001: Remove Extensions & Helper Functions
-- Idempotent: YES

DROP FUNCTION IF EXISTS array_append_unique;
DROP FUNCTION IF EXISTS update_updated_at_column;

DROP PUBLICATION IF EXISTS supabase_realtime;

DROP EXTENSION IF EXISTS "pg_trgm";
DROP EXTENSION IF EXISTS "pgcrypto";
DROP EXTENSION IF EXISTS "uuid-ossp";

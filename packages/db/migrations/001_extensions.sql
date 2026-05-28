-- SyncSaga Migration 001: Extensions & Helper Functions
-- Requires: PostgreSQL 15+, Supabase
-- Idempotent: YES (all IF NOT EXISTS / OR REPLACE)

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION array_append_unique(arr anyarray, element anyelement)
RETURNS anyarray AS $$
BEGIN
    IF element IS NULL THEN
        RETURN arr;
    END IF;
    IF array_position(arr, element) IS NULL THEN
        RETURN array_append(arr, element);
    END IF;
    RETURN arr;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SUPABASE REALTIME PUBLICATION
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- ============================================================
-- Fix rooms table for existing production schema
-- The initial migration uses CREATE TABLE IF NOT EXISTS, so when
-- the table already exists with an older shape the later indexes
-- fail. This migration makes the schema convergent.
-- ============================================================

-- Add any columns that may be missing on the live rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS media_id INTEGER;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS anime_title TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS episode_number INTEGER;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS playback_state TEXT NOT NULL DEFAULT 'paused';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS "current_timestamp" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS duration DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS sync_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_episode TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS co_hosts UUID[] NOT NULL DEFAULT '{}';

-- Safe indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_private ON public.rooms(is_private);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_media ON public.rooms(media_id) WHERE media_id IS NOT NULL;

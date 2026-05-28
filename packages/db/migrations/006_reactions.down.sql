-- SyncSaga Rollback 006: Drop Reactions & Clips Tables
-- Idempotent: YES

DROP TABLE IF EXISTS public.episode_fingerprints CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.scheduled_rooms CASCADE;
DROP TABLE IF EXISTS public.watch_events CASCADE;
DROP TABLE IF EXISTS public.clips CASCADE;
DROP TABLE IF EXISTS public.timeline_reactions CASCADE;

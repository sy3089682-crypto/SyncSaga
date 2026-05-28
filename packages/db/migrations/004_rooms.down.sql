-- SyncSaga Rollback 004: Drop Room Tables
-- Idempotent: YES

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;

DROP TABLE IF EXISTS public.embed_configs CASCADE;
DROP TABLE IF EXISTS public.room_invites CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

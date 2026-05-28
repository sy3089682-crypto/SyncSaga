-- SyncSaga Rollback 002: Drop Base Tables
-- Idempotent: YES

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

DROP TABLE IF EXISTS public.bans CASCADE;
DROP TABLE IF EXISTS public.anime_metadata CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.blocked_users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

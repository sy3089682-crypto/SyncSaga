-- SyncSaga Rollback 005: Drop Social Tables
-- Idempotent: YES

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;

DROP TABLE IF EXISTS public.activity_feed CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;

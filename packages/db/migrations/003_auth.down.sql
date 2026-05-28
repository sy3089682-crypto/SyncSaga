-- SyncSaga Rollback 003: Drop Auth Tables
-- Idempotent: YES

DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhooks;

DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.webhooks CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;

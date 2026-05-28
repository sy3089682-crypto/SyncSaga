-- SyncSaga Rollback 007: Drop Analytics Tables
-- Idempotent: YES

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;

DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.extension_telemetry CASCADE;
DROP TABLE IF EXISTS public.room_metrics CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.presence_log CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;

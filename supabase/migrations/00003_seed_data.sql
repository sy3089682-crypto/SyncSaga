-- ============================================================
-- SyncSaga — Seed Data
-- ============================================================
-- Creates default subscription for existing users and
-- ensures all auth.users have a profile row.
-- Run after 00001_initial_schema.sql.
-- ============================================================

-- Ensure every auth user has a profile
INSERT INTO public.profiles (id, username, display_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Ensure every profile has a free subscription
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT p.id, 'free', 'active'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

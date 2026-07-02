-- ============================================================
-- SyncSaga — Storage Buckets and Policies
-- ============================================================
-- Creates Supabase Storage buckets for user uploads and
-- defines RLS policies for file access control.
-- Run after 00001_initial_schema.sql.
-- ============================================================

-- ============================================================
-- AVATARS BUCKET — profile pictures
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Avatar storage policies
CREATE POLICY "avatar_bucket_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatar_bucket_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatar_bucket_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatar_bucket_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- BANNERS BUCKET — room and profile banners
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "banner_bucket_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "banner_bucket_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'banners'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "banner_bucket_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'banners'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "banner_bucket_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'banners'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- CLIPS BUCKET — video clips and thumbnails
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clips',
  'clips',
  true,
  104857600,  -- 100MB
  ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "clips_bucket_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'clips');

CREATE POLICY "clips_bucket_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clips'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "clips_bucket_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'clips'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "clips_bucket_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'clips'
    AND auth_uid()::text = (storage.foldername(name))[1]
  );

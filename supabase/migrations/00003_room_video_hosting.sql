-- ============================================================
-- SyncSaga — Room Video Hosting
-- ============================================================
-- Stores only a private Storage object path in rooms. Viewers
-- receive short-lived signed URLs from the authenticated API.
-- ============================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS video_path TEXT,
  ADD COLUMN IF NOT EXISTS video_name TEXT,
  ADD COLUMN IF NOT EXISTS video_size BIGINT,
  ADD COLUMN IF NOT EXISTS video_mime_type TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-videos',
  'room-videos',
  false,
  2147483648,
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 2147483648,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'];

DROP POLICY IF EXISTS "room_videos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "room_videos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "room_videos_delete_own" ON storage.objects;

CREATE POLICY "room_videos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'room-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "room_videos_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'room-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'room-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "room_videos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'room-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

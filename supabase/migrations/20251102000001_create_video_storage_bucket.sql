-- Create video storage bucket for participant videos
-- Merkle DAG: storage.bucket.creation -> video_file_management

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'participant-videos',
  'participant-videos',
  false, -- Private bucket (authenticated access only)
  524288000, -- 500MB limit per file
  ARRAY['video/webm', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'objects'
    AND n.nspname = 'storage'
    AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage all videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all videos" ON storage.objects;
DROP POLICY IF EXISTS "Participants can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Participants can view their own videos" ON storage.objects;

-- Policy: Service role (server-side) can do everything
CREATE POLICY "Service role can manage all videos" ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'participant-videos')
  WITH CHECK (bucket_id = 'participant-videos');

-- Policy: Authenticated users can upload videos to their own folder
-- Path format: {participantId}/{sessionId}/{filename}
CREATE POLICY "Participants can upload their own videos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'participant-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Authenticated users can view videos in their own folder
CREATE POLICY "Participants can view their own videos" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'participant-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Admin can manage all videos (for backend operations)
-- This allows server-side code to upload/manage videos for any participant
CREATE POLICY "Admin can manage all videos" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'participant-videos'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'participant-videos'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Comment: Storage structure
-- participant-videos/
--   {participantId}/
--     {sessionId}/
--       {sessionType}-video.webm
-- Example: participant-videos/participant-001/session-001/session-1-video.webm


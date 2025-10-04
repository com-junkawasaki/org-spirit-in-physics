-- Enable storage and create bucket policies for spirit-in-physics bucket
-- Note: Bucket is already created via config.toml, so we only need policies

-- Enable RLS on storage.objects (only if not already enabled)
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
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create policy for participants to upload their own files
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'spirit-in-physics'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policy for participants to view their own files
CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'spirit-in-physics'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policy for participants to update their own files
CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'spirit-in-physics'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policy for participants to delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'spirit-in-physics'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

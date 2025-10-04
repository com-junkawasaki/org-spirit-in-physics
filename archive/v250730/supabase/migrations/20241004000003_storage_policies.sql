-- Enable storage and create bucket policies for spirit-in-physics bucket

-- Create the spirit-in-physics bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spirit-in-physics',
  'spirit-in-physics',
  false,
  104857600, -- 100MB in bytes
  ARRAY['audio/*', 'video/*', 'image/*', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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

-- Allow service role to bypass RLS for administrative operations
-- This is needed for server-side operations
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

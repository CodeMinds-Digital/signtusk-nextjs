-- Supabase Storage Setup Script
-- Run these commands in your Supabase SQL Editor

-- 1. Create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (optional - only if you want to start fresh)
-- DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- 4. Create policies for authenticated users

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- Allow public read access to files in documents bucket
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- 5. Alternative: More restrictive policies (users can only access their own files)
-- Uncomment these if you want user-specific access control

/*
-- Allow users to upload to their own folder only
CREATE POLICY "Allow user uploads to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files only
CREATE POLICY "Allow users to read own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files only
CREATE POLICY "Allow users to update own files" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files only
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
*/

-- 6. Check if policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
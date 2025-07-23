-- Supabase Storage Setup Script (Fixed for Permissions)
-- Run these commands in your Supabase SQL Editor

-- Note: If you get "must be owner of table objects" error,
-- you need to use the Supabase Dashboard UI instead of SQL for some operations

-- 1. Create the documents bucket if it doesn't exist
-- This should work in SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Check if the bucket was created successfully
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'documents';

-- 3. Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 4. Check existing policies (this should work)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- 5. If no policies exist, you'll need to create them via the Dashboard UI
-- Go to: Authentication > Policies > storage.objects

-- 6. Alternative: Check if you can create policies (this might fail)
-- If this fails, use the Dashboard UI method below

DO $$
BEGIN
  -- Try to create a simple policy
  EXECUTE 'CREATE POLICY "test_policy" ON storage.objects FOR SELECT USING (bucket_id = ''documents'')';
  RAISE NOTICE 'Policy creation successful - you can use SQL';
  -- Clean up test policy
  EXECUTE 'DROP POLICY "test_policy" ON storage.objects';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Policy creation failed - use Dashboard UI method';
  WHEN OTHERS THEN
    RAISE NOTICE 'Policy creation failed - use Dashboard UI method';
END $$;

-- 7. Check authentication functions (should work)
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 8. Test bucket access
SELECT bucket_id, name, id, created_at 
FROM storage.objects 
WHERE bucket_id = 'documents' 
LIMIT 5;
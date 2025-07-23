# Supabase Storage RLS Policy Fix

## 🚨 Problem
Getting "new row violates row-level security policy" error when uploading files to Supabase Storage.

## 🔧 Solutions

### Option 1: Create Proper RLS Policies (Recommended)

#### 1. Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to **Authentication** → **Policies**
3. Find the **storage.objects** table
4. Create the following policies:

#### 2. Policy for Authenticated Users (Upload)
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

#### 3. Policy for Public Read Access
```sql
-- Allow public read access to files
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');
```

#### 4. Policy for User-Specific Access (More Secure)
```sql
-- Allow users to upload to their own folder
CREATE POLICY "Allow user uploads to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files
CREATE POLICY "Allow users to read own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 5. Policy for Admin Access
```sql
-- Allow admin users full access
CREATE POLICY "Allow admin full access" ON storage.objects
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin'
);
```

### Option 2: Disable RLS Temporarily (Not Recommended for Production)

#### In Supabase Dashboard:
1. Go to **Database** → **Tables**
2. Find **storage.objects** table
3. Click on the table
4. Go to **Settings** tab
5. Toggle off **Enable RLS**

⚠️ **Warning**: This makes all files publicly accessible!

### Option 3: Use Service Role Key (Server-Side Only)

Create a separate Supabase client for server-side operations:

```typescript
// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service role key

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

Then use it in API routes:
```typescript
// In your API route
import { supabaseAdmin } from '@/lib/supabase-admin';

const { data, error } = await supabaseAdmin.storage
  .from('documents')
  .upload(fileName, file);
```

## 🔐 Recommended Setup for Your App

### 1. Create Storage Bucket Policies

```sql
-- Enable RLS on the bucket
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to access documents bucket
CREATE POLICY "Allow authenticated access to documents bucket" ON storage.buckets
FOR SELECT USING (id = 'documents' AND auth.role() = 'authenticated');
```

### 2. Create Object Policies

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- Allow authenticated users to update their files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- Allow authenticated users to delete their files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);
```

### 3. Environment Variables

Add to your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🛠️ Quick Fix for Development

If you need a quick fix for development, you can temporarily use these permissive policies:

```sql
-- Temporary permissive policy for development
CREATE POLICY "Allow all operations for development" ON storage.objects
FOR ALL USING (bucket_id = 'documents');
```

⚠️ **Remember to replace with proper policies before production!**

## ��� Debugging Steps

### 1. Check Current Policies
```sql
-- View current policies on storage.objects
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### 2. Check User Authentication
```sql
-- Check if user is authenticated (run in SQL editor while logged in)
SELECT auth.uid(), auth.role();
```

### 3. Test Policy
```sql
-- Test if current user can insert
SELECT policy_name, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND cmd = 'INSERT';
```

## 🎯 Implementation for Your App

Since your app uses JWT authentication, update your storage client to include the auth token:

```typescript
// lib/supabase-storage.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to set auth token
export const setSupabaseAuth = (token: string) => {
  supabase.auth.setSession({
    access_token: token,
    refresh_token: '',
    expires_in: 3600,
    token_type: 'bearer',
    user: null
  });
};
```

Then in your API routes, set the auth before uploading:
```typescript
// In your upload API route
import { verifyJWT } from '@/lib/jwt';
import { setSupabaseAuth } from '@/lib/supabase-storage';

const token = request.cookies.get('auth-token')?.value;
if (token) {
  const payload = verifyJWT(token);
  // Set auth for Supabase
  setSupabaseAuth(token);
}
```
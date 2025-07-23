# Supabase Storage Troubleshooting Guide

## 🚨 Common Error: "new row violates row-level security policy"

### Quick Fix Options (Choose One):

### Option 1: Use Service Role Key (Recommended)
1. **Get your Service Role Key:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key (not the `anon` key)

2. **Add to Environment Variables:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

### Option 2: Set Up RLS Policies
1. **Go to Supabase Dashboard → SQL Editor**
2. **Run the setup script:**
   ```sql
   -- Copy and paste the contents of setup-storage-policies.sql
   ```

### Option 3: Temporary Fix (Development Only)
1. **Go to Supabase Dashboard → Authentication → Policies**
2. **Find storage.objects table**
3. **Temporarily disable RLS** (NOT recommended for production)

## 🔍 Debugging Steps

### 1. Check Environment Variables
```bash
# Make sure these are set in your .env.local
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

### 2. Test Supabase Connection
Create a test file to verify connection:
```typescript
// test-supabase.js
import { supabaseAdmin } from './src/lib/supabase-admin.js';

async function testConnection() {
  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    console.log('Buckets:', data);
    console.log('Error:', error);
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

testConnection();
```

### 3. Check Bucket Exists
```sql
-- Run in Supabase SQL Editor
SELECT * FROM storage.buckets WHERE id = 'documents';
```

### 4. Check Current Policies
```sql
-- Run in Supabase SQL Editor
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

## 🛠️ Manual Policy Setup

If the automated setup doesn't work, manually create these policies:

### 1. Create Documents Bucket
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;
```

### 2. Basic Permissive Policy (Development)
```sql
-- Allow all operations on documents bucket
CREATE POLICY "Allow all operations" ON storage.objects
FOR ALL USING (bucket_id = 'documents');
```

### 3. Production-Ready Policies
```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- Allow public downloads
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');
```

## 🔧 Alternative Solutions

### Use Different Storage Service
If Supabase Storage continues to cause issues, you can switch to:

1. **AWS S3**
2. **Cloudinary**
3. **Local File Storage** (development only)

### Local File Storage (Development)
```typescript
// lib/local-storage.ts
import fs from 'fs';
import path from 'path';

export async function saveFileLocally(file: File, folder: string = 'uploads') {
  const uploadDir = path.join(process.cwd(), 'public', folder);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = path.join(uploadDir, fileName);
  
  // Save file
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  
  return {
    path: `/${folder}/${fileName}`,
    publicUrl: `http://localhost:3000/${folder}/${fileName}`
  };
}
```

## 📞 Getting Help

### 1. Check Supabase Status
Visit: https://status.supabase.com/

### 2. Supabase Discord
Join: https://discord.supabase.com/

### 3. GitHub Issues
Check: https://github.com/supabase/supabase/issues

### 4. Documentation
Read: https://supabase.com/docs/guides/storage

## 🎯 Quick Test

Run this test to verify everything is working:

```bash
# Test the upload endpoint
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.pdf" \
  -F "bucket=documents"
```

## ✅ Success Indicators

You'll know it's working when:
1. No RLS policy errors in console
2. Files appear in Supabase Storage dashboard
3. Public URLs are accessible
4. Upload/download operations complete successfully

## 🚀 Performance Tips

1. **Use CDN** for file delivery
2. **Compress files** before upload
3. **Implement caching** for frequently accessed files
4. **Use signed URLs** for temporary access
5. **Monitor storage usage** in Supabase dashboard
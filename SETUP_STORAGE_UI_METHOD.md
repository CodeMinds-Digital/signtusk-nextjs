# Supabase Storage Setup - Dashboard UI Method

Since you're getting the "must be owner of table objects" error, you need to set up storage policies through the Supabase Dashboard UI instead of SQL.

## 🎯 Quick Solution: Use Service Role Key (Recommended)

**The easiest fix is to use the service role key approach I already implemented. This bypasses all RLS policies:**

1. **Get your Service Role Key:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key

2. **Add to your `.env.local`:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

**This should fix the upload error immediately without needing to set up policies.**

---

## 🔧 Alternative: Manual Policy Setup via Dashboard

If you still want to set up proper RLS policies, follow these steps:

### Step 1: Create Storage Bucket

1. **Go to Supabase Dashboard**
2. **Navigate to Storage**
3. **Click "Create Bucket"**
4. **Settings:**
   - Bucket name: `documents`
   - Public bucket: ✅ **Enabled**
   - File size limit: `50 MB`
   - Allowed MIME types: `application/pdf, image/jpeg, image/png, image/gif, text/plain`

### Step 2: Set Up RLS Policies

1. **Go to Authentication → Policies**
2. **Find the `storage.objects` table**
3. **Click "New Policy"**

### Step 3: Create Upload Policy

**Policy Name:** `Allow authenticated uploads`
**Policy Type:** `INSERT`
**Target Roles:** `authenticated`

**Policy Definition:**
```sql
bucket_id = 'documents'
```

**Check Expression:**
```sql
bucket_id = 'documents'
```

### Step 4: Create Download Policy

**Policy Name:** `Allow public downloads`
**Policy Type:** `SELECT`
**Target Roles:** `anon, authenticated`

**Policy Definition:**
```sql
bucket_id = 'documents'
```

### Step 5: Create Update Policy

**Policy Name:** `Allow authenticated updates`
**Policy Type:** `UPDATE`
**Target Roles:** `authenticated`

**Policy Definition:**
```sql
bucket_id = 'documents'
```

### Step 6: Create Delete Policy

**Policy Name:** `Allow authenticated deletes`
**Policy Type:** `DELETE`
**Target Roles:** `authenticated`

**Policy Definition:**
```sql
bucket_id = 'documents'
```

## 🔍 Verify Setup

### Test in SQL Editor:
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'documents';

-- Check policies exist
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

## 🚨 If UI Method Also Fails

If you can't create policies through the UI either, it means your Supabase project has restricted permissions. In this case:

### Option 1: Use Service Role Key (Already Implemented)
This is the best solution and what I've already set up for you.

### Option 2: Contact Supabase Support
If you need RLS policies for compliance reasons, contact Supabase support to enable policy creation.

### Option 3: Temporarily Disable RLS (NOT Recommended)
1. Go to Database → Tables
2. Find `storage.objects`
3. Click on the table
4. Go to Settings
5. Toggle off "Enable RLS"

⚠️ **Warning:** This makes all files publicly accessible!

## 🎯 Recommended Approach

**Just use the Service Role Key method I implemented:**

1. The admin functions in `supabase-admin.ts` bypass all RLS issues
2. Your API routes are already updated to use these functions
3. Security is maintained through your application's authentication
4. No policy setup required

**Your upload error should be fixed once you add the service role key to your environment variables.**

## 🔐 Why Service Role Key is Better

1. **No Policy Conflicts:** Bypasses all RLS restrictions
2. **Full Control:** You control access through your API routes
3. **Simpler Setup:** No complex policy configuration needed
4. **More Secure:** Server-side only, never exposed to client
5. **Production Ready:** Used by many production applications

## 📝 Environment Variables Needed

```env
# Required for the fix
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Your existing variables
JWT_SECRET=your_jwt_secret
```

**Once you add the `SUPABASE_SERVICE_ROLE_KEY`, your document upload should work immediately!**
# Supabase Storage Guide

This guide shows how to store and retrieve files from Supabase Storage in your Next.js application.

## 📋 Table of Contents

1. [Setup](#setup)
2. [Environment Configuration](#environment-configuration)
3. [Storage Functions](#storage-functions)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)
6. [Error Handling](#error-handling)

## 🔧 Setup

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Create Storage Bucket

In your Supabase dashboard:
1. Go to Storage
2. Create a new bucket (e.g., "documents")
3. Set bucket policies for public/private access

## ⚙️ Environment Configuration

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📁 Storage Functions

### Basic Upload Function

```typescript
import { supabase } from '@/lib/supabase-storage';

export async function uploadFile(file: File, bucket: string = 'documents') {
  const fileName = `${Date.now()}_${file.name}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return { data, fileName };
}
```

### Basic Download Function

```typescript
export async function downloadFile(bucket: string, path: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  return data; // Returns Blob
}
```

### Get Public URL

```typescript
export function getFileUrl(bucket: string, path: string) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
```

## 💡 Usage Examples

### 1. File Upload Component

```typescript
'use client';

import React, { useState } from 'react';
import { uploadFileToSupabase } from '@/lib/supabase-storage';

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFileToSupabase(file, 'documents');
      
      if (result.error) {
        setUploadResult(`Error: ${result.error.message}`);
      } else {
        setUploadResult(`Success! File URL: ${result.publicUrl}`);
      }
    } catch (error) {
      setUploadResult(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />
      
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>

      {uploadResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          {uploadResult}
        </div>
      )}
    </div>
  );
}
```

### 2. File Download Component

```typescript
'use client';

import React, { useState } from 'react';
import { downloadFileFromSupabase } from '@/lib/supabase-storage';

export default function FileDownloader() {
  const [downloading, setDownloading] = useState(false);
  const [filePath, setFilePath] = useState('');

  const handleDownload = async () => {
    if (!filePath) return;

    setDownloading(true);
    try {
      const result = await downloadFileFromSupabase('documents', filePath);
      
      if (result.error) {
        alert(`Error: ${result.error.message}`);
      } else {
        // Create download link
        const url = URL.createObjectURL(result.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = filePath.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6">
      <input
        type="text"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
        placeholder="Enter file path (e.g., folder/filename.pdf)"
        className="w-full p-2 border rounded mb-4"
      />
      
      <button
        onClick={handleDownload}
        disabled={!filePath || downloading}
        className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {downloading ? 'Downloading...' : 'Download File'}
      </button>
    </div>
  );
}
```

### 3. File List Component

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { listFilesInSupabase, getPublicUrl } from '@/lib/supabase-storage';

export default function FileList() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const result = await listFilesInSupabase('documents');
      
      if (result.error) {
        console.error('Error loading files:', result.error);
      } else {
        setFiles(result.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading files...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Files in Storage</h2>
      
      {files.length === 0 ? (
        <p>No files found</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.name} className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  Size: {(file.metadata?.size / 1024).toFixed(2)} KB
                </p>
              </div>
              
              <div className="space-x-2">
                <a
                  href={getPublicUrl('documents', file.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  View
                </a>
                
                <button
                  onClick={() => {
                    const url = getPublicUrl('documents', file.name);
                    window.open(url, '_blank');
                  }}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 🔒 Best Practices

### 1. File Organization

```typescript
// Organize files by user and date
const generateFilePath = (userId: string, fileName: string) => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `users/${userId}/${date}/${Date.now()}_${fileName}`;
};

// Usage
const filePath = generateFilePath('user123', 'document.pdf');
await uploadFileToSupabase(file, 'documents', filePath);
```

### 2. File Validation

```typescript
const validateFile = (file: File) => {
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB');
  }

  // Check file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }

  return true;
};
```

### 3. Progress Tracking

```typescript
const uploadWithProgress = async (file: File, onProgress: (progress: number) => void) => {
  const fileName = `${Date.now()}_${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      onUploadProgress: (progress) => {
        const percentage = (progress.loaded / progress.total) * 100;
        onProgress(percentage);
      }
    });

  return { data, error };
};
```

## ⚠️ Error Handling

### Common Error Scenarios

```typescript
const handleStorageOperation = async () => {
  try {
    const result = await uploadFileToSupabase(file);
    
    if (result.error) {
      switch (result.error.message) {
        case 'The resource already exists':
          console.log('File already exists, use upsert: true');
          break;
        case 'Row level security violation':
          console.log('Check your RLS policies');
          break;
        case 'Invalid bucket':
          console.log('Bucket does not exist');
          break;
        default:
          console.error('Upload error:', result.error);
      }
    }
  } catch (error) {
    console.error('Network or other error:', error);
  }
};
```

## 🔐 Security Considerations

### 1. Row Level Security (RLS)

Set up RLS policies in Supabase:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to access their own files
CREATE POLICY "Allow user access to own files" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. File Access Control

```typescript
// Check if user can access file
const canAccessFile = (filePath: string, userId: string) => {
  return filePath.startsWith(`users/${userId}/`);
};

// Secure download
const secureDownload = async (filePath: string, userId: string) => {
  if (!canAccessFile(filePath, userId)) {
    throw new Error('Access denied');
  }
  
  return await downloadFileFromSupabase('documents', filePath);
};
```

## 📊 Storage Bucket Configuration

### Public Bucket (for public files)
- Files are accessible via public URL
- No authentication required
- Good for: Public documents, images

### Private Bucket (for sensitive files)
- Requires authentication
- Access controlled by RLS policies
- Good for: User documents, private files

## 🚀 Advanced Features

### 1. Signed URLs (for temporary access)

```typescript
const getSignedUrl = async (bucket: string, path: string, expiresIn: number = 3600) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
};
```

### 2. Image Transformations

```typescript
const getTransformedImageUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path, {
      transform: {
        width: 300,
        height: 300,
        resize: 'cover'
      }
    });

  return data.publicUrl;
};
```

This guide covers the essential aspects of working with Supabase Storage in your Next.js application. The existing implementation in your project already includes most of these functions and follows these best practices.
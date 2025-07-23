# Supabase Storage Quick Reference

## 🚀 Quick Start

### 1. Upload a File
```typescript
import { uploadFileToSupabase } from '@/lib/supabase-storage';

const handleUpload = async (file: File) => {
  const result = await uploadFileToSupabase(file, 'documents');
  if (result.error) {
    console.error('Upload failed:', result.error);
  } else {
    console.log('File uploaded:', result.publicUrl);
  }
};
```

### 2. Download a File
```typescript
import { downloadFileFromSupabase } from '@/lib/supabase-storage';

const handleDownload = async (filePath: string) => {
  const result = await downloadFileFromSupabase('documents', filePath);
  if (result.error) {
    console.error('Download failed:', result.error);
  } else {
    // Create download link
    const url = URL.createObjectURL(result.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'filename.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }
};
```

### 3. Get Public URL
```typescript
import { getPublicUrl } from '@/lib/supabase-storage';

const fileUrl = getPublicUrl('documents', 'path/to/file.pdf');
console.log('Public URL:', fileUrl);
```

### 4. List Files
```typescript
import { listFilesInSupabase } from '@/lib/supabase-storage';

const loadFiles = async () => {
  const result = await listFilesInSupabase('documents');
  if (result.error) {
    console.error('List failed:', result.error);
  } else {
    console.log('Files:', result.data);
  }
};
```

### 5. Delete a File
```typescript
import { deleteFileFromSupabase } from '@/lib/supabase-storage';

const handleDelete = async (filePath: string) => {
  const result = await deleteFileFromSupabase('documents', filePath);
  if (result.error) {
    console.error('Delete failed:', result.error);
  } else {
    console.log('File deleted successfully');
  }
};
```

## 📁 File Organization Patterns

### User-based Organization
```typescript
const userFilePath = `users/${userId}/${Date.now()}_${fileName}`;
```

### Date-based Organization
```typescript
const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const dateFilePath = `uploads/${date}/${fileName}`;
```

### Category-based Organization
```typescript
const categoryPath = `documents/${category}/${subcategory}/${fileName}`;
```

## 🔒 Security Best Practices

### 1. File Validation
```typescript
const validateFile = (file: File) => {
  // Size check (10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large');
  }
  
  // Type check
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }
};
```

### 2. Secure File Paths
```typescript
const sanitizeFileName = (fileName: string) => {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
};
```

### 3. Access Control
```typescript
const canAccessFile = (filePath: string, userId: string) => {
  return filePath.startsWith(`users/${userId}/`);
};
```

## 🎯 Common Use Cases

### 1. Profile Picture Upload
```typescript
const uploadProfilePicture = async (file: File, userId: string) => {
  const filePath = `profiles/${userId}/avatar_${Date.now()}.jpg`;
  return await uploadFileToSupabase(file, 'avatars', filePath);
};
```

### 2. Document Management
```typescript
const uploadDocument = async (file: File, userId: string, category: string) => {
  const filePath = `documents/${userId}/${category}/${Date.now()}_${file.name}`;
  return await uploadFileToSupabase(file, 'documents', filePath);
};
```

### 3. Temporary File Upload
```typescript
const uploadTempFile = async (file: File) => {
  const filePath = `temp/${Date.now()}_${file.name}`;
  return await uploadFileToSupabase(file, 'temp', filePath);
};
```

## 🔧 Error Handling

### Common Errors and Solutions
```typescript
const handleStorageError = (error: any) => {
  switch (error.message) {
    case 'The resource already exists':
      return 'File already exists. Use a different name or enable overwrite.';
    case 'Row level security violation':
      return 'Access denied. Check your permissions.';
    case 'Invalid bucket':
      return 'Storage bucket does not exist.';
    case 'File size too large':
      return 'File is too large. Maximum size is 10MB.';
    default:
      return `Storage error: ${error.message}`;
  }
};
```

## 📊 Storage Monitoring

### Get Storage Usage
```typescript
const getStorageStats = async (bucket: string) => {
  const result = await listFilesInSupabase(bucket);
  if (result.data) {
    const totalSize = result.data.reduce((sum, file) => 
      sum + (file.metadata?.size || 0), 0
    );
    return {
      fileCount: result.data.length,
      totalSize: totalSize,
      formattedSize: formatFileSize(totalSize)
    };
  }
  return null;
};
```

## 🌐 API Routes

### Upload via API
```typescript
const uploadViaAPI = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'documents');
  formData.append('folder', 'uploads');

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData
  });

  return await response.json();
};
```

### Download via API
```typescript
const downloadViaAPI = async (filePath: string) => {
  const response = await fetch(`/api/storage/download?path=${filePath}`);
  
  if (response.ok) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filePath.split('/').pop() || 'download';
    link.click();
    URL.revokeObjectURL(url);
  }
};
```

## 🎨 UI Components

### File Upload Button
```typescript
const FileUploadButton = ({ onUpload }: { onUpload: (file: File) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
        style={{ display: 'none' }}
      />
      <button onClick={() => fileInputRef.current?.click()}>
        Upload File
      </button>
    </>
  );
};
```

### Progress Bar
```typescript
const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${progress}%` }}
    />
  </div>
);
```

This quick reference covers the most common operations you'll need when working with Supabase Storage in your Next.js application.
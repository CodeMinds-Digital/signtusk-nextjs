'use client';

import React, { useState, useEffect } from 'react';
import { 
  uploadFileToSupabase, 
  downloadFileFromSupabase, 
  listFilesInSupabase, 
  deleteFileFromSupabase,
  getPublicUrl 
} from '@/lib/supabase-storage';

interface FileItem {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
  };
}

export default function SupabaseStorageDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');

  // Load files on component mount
  useEffect(() => {
    loadFiles();
  }, []);

  // Load files from Supabase Storage
  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await listFilesInSupabase('documents');
      
      if (result.error) {
        setMessage(`Error loading files: ${result.error.message}`);
      } else {
        setFiles(result.data || []);
        setMessage(`Loaded ${result.data?.length || 0} files`);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file first');
      return;
    }

    // Validate file
    if (selectedFile.size > 10 * 1024 * 1024) {
      setMessage('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Create organized file path
      const timestamp = Date.now();
      const filePath = `demo/${timestamp}_${selectedFile.name}`;
      
      const result = await uploadFileToSupabase(selectedFile, 'documents', filePath);
      
      if (result.error) {
        setMessage(`Upload failed: ${result.error.message}`);
      } else {
        setMessage(`Upload successful! File available at: ${result.publicUrl}`);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Reload files list
        await loadFiles();
      }
    } catch (error) {
      setMessage(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file download
  const handleDownload = async (fileName: string) => {
    setDownloading(fileName);
    
    try {
      const result = await downloadFileFromSupabase('documents', fileName);
      
      if (result.error) {
        setMessage(`Download failed: ${result.error.message}`);
      } else {
        // Create download link
        const url = URL.createObjectURL(result.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setMessage(`Downloaded: ${fileName}`);
      }
    } catch (error) {
      setMessage(`Download error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloading('');
    }
  };

  // Handle file deletion
  const handleDelete = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) {
      return;
    }

    try {
      const result = await deleteFileFromSupabase('documents', fileName);
      
      if (result.error) {
        setMessage(`Delete failed: ${result.error.message}`);
      } else {
        setMessage(`Deleted: ${fileName}`);
        await loadFiles(); // Reload files list
      }
    } catch (error) {
      setMessage(`Delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Supabase Storage Demo</h1>
      
      {/* Message Display */}
      {message && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">{message}</p>
        </div>
      )}

      {/* File Upload Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload File</h2>
        
        <div className="space-y-4">
          <div>
            <input
              id="file-input"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          {selectedFile && (
            <div className="p-3 bg-white rounded border">
              <p className="text-sm text-gray-600">
                <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            </div>
          )}
          
          {uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      {/* Files List Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Files in Storage</h2>
          <button
            onClick={loadFiles}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No files found in storage</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {files.map((file) => (
              <div key={file.name} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 mb-2">{file.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Size:</span> {formatFileSize(file.metadata?.size || 0)}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {file.metadata?.mimetype || 'Unknown'}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(file.created_at)}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span> {formatDate(file.updated_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <a
                      href={getPublicUrl('documents', file.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      View
                    </a>
                    
                    <button
                      onClick={() => handleDownload(file.name)}
                      disabled={downloading === file.name}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      {downloading === file.name ? 'Downloading...' : 'Download'}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(file.name)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Storage Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-3 rounded border">
            <p className="font-medium text-gray-600">Total Files</p>
            <p className="text-2xl font-bold text-blue-600">{files.length}</p>
          </div>
          <div className="bg-white p-3 rounded border">
            <p className="font-medium text-gray-600">Total Size</p>
            <p className="text-2xl font-bold text-green-600">
              {formatFileSize(files.reduce((total, file) => total + (file.metadata?.size || 0), 0))}
            </p>
          </div>
          <div className="bg-white p-3 rounded border">
            <p className="font-medium text-gray-600">Bucket</p>
            <p className="text-2xl font-bold text-purple-600">documents</p>
          </div>
        </div>
      </div>
    </div>
  );
}
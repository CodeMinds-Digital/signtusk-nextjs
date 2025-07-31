'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { generateDocumentHashServer } from '@/lib/document-server';
import DuplicateDocumentModal from './DuplicateDocumentModal';

interface DocumentUploadProps {
  onUploadSuccess?: (document: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface DuplicateInfo {
  action: 'allow' | 'block' | 'confirm';
  existing_document?: {
    id: string;
    file_name: string;
    status: string;
    created_at: string;
    signed_at?: string;
    signer_id?: string;
    public_url?: string;
    signed_public_url?: string;
  };
  can_proceed: boolean;
}

export default function DocumentUploadWithDuplicateCheck({
  onUploadSuccess,
  onUploadError,
  className = ''
}: DocumentUploadProps) {
  const { currentUser } = useWallet();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    metadata?: any;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        onUploadError?.('Only PDF files are supported');
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        onUploadError?.('File size must be less than 50MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const checkForDuplicates = async (file: File): Promise<boolean> => {
    try {
      // Generate hash to check for duplicates
      const documentHash = await generateDocumentHashServer(file);

      // Check for duplicates via API
      const response = await fetch(`/api/documents/upload-with-duplicate-check?hash=${documentHash}&userId=${currentUser?.custom_id}`);
      const result = await response.json();

      if (result.success && result.duplicate_check) {
        const duplicateCheck = result.duplicate_check;

        if (duplicateCheck.isDuplicate) {
          setDuplicateMessage(result.message);
          setDuplicateInfo({
            action: duplicateCheck.action,
            existing_document: duplicateCheck.existingDocument,
            can_proceed: duplicateCheck.canProceed
          });

          if (duplicateCheck.action === 'block') {
            setShowDuplicateModal(true);
            return false; // Block upload
          } else if (duplicateCheck.action === 'confirm') {
            setPendingUpload({ file });
            setShowDuplicateModal(true);
            return false; // Wait for user confirmation
          }
        }
      }

      return true; // No duplicates or can proceed
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // If duplicate check fails, allow upload to proceed
      return true;
    }
  };

  const performUpload = async (file: File, forceUpload: boolean = false) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('forceUpload', forceUpload.toString());

      // Add metadata if needed
      const metadata = {
        uploader_id: currentUser?.custom_id,
        upload_timestamp: new Date().toISOString()
      };
      formData.append('metadata', JSON.stringify(metadata));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/documents/upload-with-duplicate-check', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (result.success) {
        onUploadSuccess?.(result.document);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Handle duplicate detection from server
        if (result.error === 'duplicate_document' || result.error === 'duplicate_confirmation_required') {
          setDuplicateMessage(result.message);
          setDuplicateInfo(result.duplicate_info);
          setPendingUpload({ file });
          setShowDuplicateModal(true);
        } else {
          onUploadError?.(result.message || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentUser) {
      onUploadError?.('Please select a file and ensure you are logged in');
      return;
    }

    // Check for duplicates first
    const canProceed = await checkForDuplicates(selectedFile);

    if (canProceed) {
      await performUpload(selectedFile);
    }
  };

  const handleDuplicateConfirm = async () => {
    setShowDuplicateModal(false);

    if (pendingUpload) {
      await performUpload(pendingUpload.file, true); // Force upload
      setPendingUpload(null);
    }
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateModal(false);
    setPendingUpload(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewExisting = () => {
    if (duplicateInfo?.existing_document?.public_url) {
      window.open(duplicateInfo.existing_document.public_url, '_blank');
    } else if (duplicateInfo?.existing_document?.signed_public_url) {
      window.open(duplicateInfo.existing_document.signed_public_url, '_blank');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Selection */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />

        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="space-y-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span> or drag and drop
            </div>
            <p className="text-xs text-gray-500">PDF files only, up to 50MB</p>
          </div>
        </label>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Uploading...</span>
            <span className="text-gray-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading || !currentUser}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isUploading ? 'Uploading...' : 'Upload Document'}
      </button>

      {/* Duplicate Document Modal */}
      {showDuplicateModal && duplicateInfo && (
        <DuplicateDocumentModal
          isOpen={showDuplicateModal}
          message={duplicateMessage}
          duplicateInfo={duplicateInfo}
          onConfirm={handleDuplicateConfirm}
          onCancel={handleDuplicateCancel}
          onViewExisting={handleViewExisting}
        />
      )}
    </div>
  );
}
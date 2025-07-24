'use client';

import React from 'react';

interface DuplicateDocumentInfo {
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

interface DuplicateDocumentModalProps {
  isOpen: boolean;
  message: string;
  duplicateInfo: DuplicateDocumentInfo;
  onConfirm: () => void;
  onCancel: () => void;
  onViewExisting?: () => void;
}

export default function DuplicateDocumentModal({
  isOpen,
  message,
  duplicateInfo,
  onConfirm,
  onCancel,
  onViewExisting
}: DuplicateDocumentModalProps) {
  if (!isOpen) return null;

  const { action, existing_document } = duplicateInfo;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'signed':
        return 'text-blue-600 bg-blue-100';
      case 'accepted':
        return 'text-yellow-600 bg-yellow-100';
      case 'uploaded':
        return 'text-gray-600 bg-gray-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getIcon = () => {
    switch (action) {
      case 'block':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'confirm':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (action) {
      case 'block':
        return 'Document Already Exists';
      case 'confirm':
        return 'Duplicate Document Detected';
      default:
        return 'Document Information';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          {getIcon()}
          
          <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
            {getTitle()}
          </h3>
          
          <div className="mt-4 px-7 py-3">
            <p className="text-sm text-gray-500 mb-4">
              {message}
            </p>

            {existing_document && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Existing Document Details:</h4>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium text-gray-600">File Name:</span>
                    <span className="ml-2 text-gray-800">{existing_document.file_name}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(existing_document.status)}`}>
                      {existing_document.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-600">Uploaded:</span>
                    <span className="ml-2 text-gray-800">
                      {new Date(existing_document.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {existing_document.signer_id && (
                    <div>
                      <span className="font-medium text-gray-600">Signer:</span>
                      <span className="ml-2 text-gray-800 font-mono">{existing_document.signer_id}</span>
                    </div>
                  )}
                  
                  {existing_document.signed_at && (
                    <div>
                      <span className="font-medium text-gray-600">Signed:</span>
                      <span className="ml-2 text-gray-800">
                        {new Date(existing_document.signed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {(existing_document.public_url || existing_document.signed_public_url) && onViewExisting && (
                  <button
                    onClick={onViewExisting}
                    className="mt-3 w-full bg-blue-50 text-blue-600 py-2 px-4 rounded-md text-sm hover:bg-blue-100 transition-colors"
                  >
                    View Existing Document
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="items-center px-4 py-3">
            {action === 'block' ? (
              // Only show OK button for blocked uploads
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                OK, I'll Upload a New Document
              </button>
            ) : action === 'confirm' ? (
              // Show both options for confirmation needed
              <div className="flex space-x-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="px-4 py-2 bg-yellow-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  Continue Anyway
                </button>
              </div>
            ) : (
              // Default case
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
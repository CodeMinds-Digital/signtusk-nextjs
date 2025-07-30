/**
 * Steganography success component showing backup results and download options
 */

'use client';

import React, { useState } from 'react';
import { downloadSteganographicImage } from '@/lib/steganography-client';

interface SteganographySuccessProps {
  stegoKey: string;
  imageId: string;
  imageName: string;
  dataType: string;
  fileSize?: number;
  expiresAt?: string;
  onContinue: () => void;
}

export default function SteganographySuccess({
  stegoKey,
  imageId,
  imageName,
  dataType,
  fileSize,
  expiresAt,
  onContinue
}: SteganographySuccessProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [stegoKeyCopied, setStegoKeyCopied] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleCopyStegoKey = async () => {
    try {
      await navigator.clipboard.writeText(stegoKey);
      setStegoKeyCopied(true);
      setTimeout(() => setStegoKeyCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy stego key:', error);
    }
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      const result = await downloadSteganographicImage(imageId);
      
      if (result.success && result.imageBlob && result.filename) {
        // Create download link
        const url = URL.createObjectURL(result.imageBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        setDownloadError(result.error || 'Failed to download image');
      }
    } catch (error) {
      setDownloadError('An unexpected error occurred while downloading');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Backup Created Successfully!</h2>
        <p className="text-gray-600">
          Your wallet has been securely hidden in a steganographic image
        </p>
      </div>

      <div className="space-y-4">
        {/* Backup Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Backup Name:</span>
            <span className="text-sm text-gray-900">{imageName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <span className="text-sm text-gray-900 capitalize">{dataType.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">File Size:</span>
            <span className="text-sm text-gray-900">{formatFileSize(fileSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Expires:</span>
            <span className="text-sm text-gray-900">{formatExpiryDate(expiresAt)}</span>
          </div>
        </div>

        {/* Steganographic Key */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-bold text-red-800">CRITICAL: Save Your Steganographic Key</h3>
          </div>
          <p className="text-sm text-red-700 mb-3">
            This key is required to extract your wallet from the image. It cannot be recovered if lost!
          </p>
          <div className="bg-white border border-red-300 rounded p-3">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-gray-900 break-all flex-1 mr-2">
                {stegoKey}
              </code>
              <button
                onClick={handleCopyStegoKey}
                className="flex-shrink-0 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              >
                {stegoKeyCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Download Section */}
        <div className="space-y-3">
          <button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Steganographic Image
              </>
            )}
          </button>

          {downloadError && (
            <div className="text-sm text-red-600 text-center">
              {downloadError}
            </div>
          )}
        </div>

        {/* Security Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-blue-800 mb-2">Security Best Practices:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Store the steganographic key in a secure password manager</li>
            <li>• Keep the image file in a safe location (cloud storage, USB drive)</li>
            <li>• Never share the key and image together</li>
            <li>• Test the restoration process to ensure it works</li>
          </ul>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}

/**
 * Steganography backup component for creating secure image backups during signup
 */

'use client';

import React, { useState, useRef } from 'react';
import { createSteganographicBackup, validateImageFile, WalletData } from '@/lib/steganography-client';

interface SteganographyBackupProps {
  walletData: WalletData;
  password: string;
  onBackupCreated: (stegoKey: string, imageId: string) => void;
  onSkip: () => void;
  onError: (error: string) => void;
}

export default function SteganographyBackup({
  walletData,
  password,
  onBackupCreated,
  onSkip,
  onError
}: SteganographyBackupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [carrierImage, setCarrierImage] = useState<File | null>(null);
  const [imageName, setImageName] = useState('');
  const [dataType, setDataType] = useState<'wallet_backup' | 'private_key' | 'mnemonic'>('wallet_backup');
  const [expiresInDays, setExpiresInDays] = useState<number>(365);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      onError(validation.error || 'Invalid image file');
      return;
    }

    setCarrierImage(file);
  };

  const handleCreateBackup = async () => {
    if (!imageName.trim()) {
      onError('Please enter a name for your backup image');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createSteganographicBackup({
        walletData: {
          ...walletData,
          customId: walletData.customId || 'temp_id'
        },
        password,
        imageName: imageName.trim(),
        dataType,
        expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
        carrierImage: carrierImage || undefined
      });

      if (result.success && result.stegoKey && result.imageId) {
        onBackupCreated(result.stegoKey, result.imageId);
      } else {
        onError(result.error || 'Failed to create steganographic backup');
      }
    } catch (error) {
      onError('An unexpected error occurred while creating the backup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Steganographic Backup</h2>
        <p className="text-gray-600">
          Hide your wallet securely inside an image for ultimate protection
        </p>
      </div>

      <div className="space-y-4">
        {/* Backup Name */}
        <div>
          <label htmlFor="imageName" className="block text-sm font-medium text-gray-700 mb-1">
            Backup Name *
          </label>
          <input
            type="text"
            id="imageName"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            placeholder="My Wallet Backup"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
            disabled={isLoading}
          />
        </div>

        {/* Carrier Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Carrier Image (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {carrierImage ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Selected: {carrierImage.name}
                </div>
                <div className="text-xs text-gray-500">
                  Size: {(carrierImage.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={() => setCarrierImage(null)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  disabled={isLoading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-sm text-gray-600">
                  Click to upload your own image or use default
                </div>
                <div className="text-xs text-gray-500">
                  PNG or JPEG, max 10MB
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isLoading}
            />
            {!carrierImage && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                Choose Image
              </button>
            )}
          </div>
        </div>

        {/* Advanced Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            disabled={isLoading}
          >
            <span>Advanced Options</span>
            <svg
              className={`w-4 h-4 ml-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-md">
              <div>
                <label htmlFor="dataType" className="block text-sm font-medium text-gray-700 mb-1">
                  Backup Type
                </label>
                <select
                  id="dataType"
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  disabled={isLoading}
                >
                  <option value="wallet_backup">Full Wallet (Recommended)</option>
                  <option value="mnemonic">Mnemonic Only</option>
                  <option value="private_key">Private Key Only</option>
                </select>
              </div>

              <div>
                <label htmlFor="expiresInDays" className="block text-sm font-medium text-gray-700 mb-1">
                  Expires After (Days)
                </label>
                <input
                  type="number"
                  id="expiresInDays"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 0)}
                  min="0"
                  max="3650"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  disabled={isLoading}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Set to 0 for no expiration
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <strong>Important:</strong> You will receive a steganographic key. Store it securely - it cannot be recovered if lost!
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Skip for Now
          </button>
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={isLoading || !imageName.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}

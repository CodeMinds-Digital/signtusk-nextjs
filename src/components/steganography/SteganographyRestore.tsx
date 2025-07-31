/**
 * Steganography restore component for recovering wallet from steganographic images
 */

'use client';

import React, { useState, useRef } from 'react';
import { extractFromSteganographicImage, validateImageFile } from '@/lib/steganography-client';

interface SteganographyRestoreProps {
  onWalletRestored: (walletData: {
    address: string;
    customId?: string;
    mnemonic?: string;
    privateKey?: string;
  }) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export default function SteganographyRestore({
  onWalletRestored,
  onCancel,
  onError
}: SteganographyRestoreProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [stegoImage, setStegoImage] = useState<File | null>(null);
  const [stegoKey, setStegoKey] = useState('');
  const [password, setPassword] = useState('');
  const [dataType, setDataType] = useState<'wallet_backup' | 'private_key' | 'mnemonic'>('wallet_backup');
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      onError(validation.error || 'Invalid image file');
      return;
    }

    setStegoImage(file);
  };

  const handleRestore = async () => {
    if (!stegoImage) {
      onError('Please select a steganographic image');
      return;
    }

    if (!stegoKey.trim()) {
      onError('Please enter the steganographic key');
      return;
    }

    if (!password.trim()) {
      onError('Please enter your wallet password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await extractFromSteganographicImage({
        stegoImage,
        stegoKey: stegoKey.trim(),
        password: password.trim(),
        dataType
      });

      if (result.success && result.walletData) {
        onWalletRestored(result.walletData);
      } else {
        onError(result.error || 'Failed to restore wallet from steganographic image');
      }
    } catch (error) {
      onError('An unexpected error occurred while restoring the wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = stegoImage && stegoKey.trim() && password.trim();

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Restore from Steganographic Image</h2>
        <p className="text-neutral-300">
          Extract your wallet from a steganographic backup image
        </p>
      </div>

      <div className="space-y-4">
        {/* Steganographic Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Steganographic Image *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {stegoImage ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Selected: {stegoImage.name}
                </div>
                <div className="text-xs text-gray-500">
                  Size: {(stegoImage.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={() => setStegoImage(null)}
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
                  Click to upload your steganographic image
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
            {!stegoImage && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                disabled={isLoading}
              >
                Choose Image
              </button>
            )}
          </div>
        </div>

        {/* Steganographic Key */}
        <div>
          <label htmlFor="stegoKey" className="block text-sm font-medium text-neutral-300 mb-1">
            Steganographic Key *
          </label>
          <input
            type="text"
            id="stegoKey"
            value={stegoKey}
            onChange={(e) => setStegoKey(e.target.value)}
            placeholder="Enter your steganographic key"
            className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-600 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <div className="text-xs text-neutral-400 mt-1">
            The key provided when you created the steganographic backup
          </div>
        </div>

        {/* Wallet Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">
            Wallet Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your wallet password"
              className="w-full px-3 py-2 pr-10 bg-neutral-800/50 border border-neutral-600 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-300"
              disabled={isLoading}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {showPassword ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
            </button>
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            The password used to encrypt your wallet
          </div>
        </div>

        {/* Data Type Selection */}
        <div>
          <label htmlFor="dataType" className="block text-sm font-medium text-neutral-300 mb-1">
            Backup Type
          </label>
          <select
            id="dataType"
            value={dataType}
            onChange={(e) => setDataType(e.target.value as any)}
            className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="wallet_backup" className="bg-neutral-800 text-white">Full Wallet</option>
            <option value="mnemonic" className="bg-neutral-800 text-white">Mnemonic Only</option>
            <option value="private_key" className="bg-neutral-800 text-white">Private Key Only</option>
          </select>
          <div className="text-xs text-neutral-400 mt-1">
            Select the type of data stored in your steganographic image
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <strong>Secure Process:</strong> Your steganographic image is processed locally. The password and key never leave your device during extraction.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-neutral-600 text-neutral-300 rounded-md hover:bg-neutral-800/50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isLoading || !isFormValid}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Restoring...' : 'Restore Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}

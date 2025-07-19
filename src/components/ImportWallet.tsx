'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { restoreWalletFromMnemonic, encryptWallet, validateMnemonic, WalletData } from '@/lib/wallet';
import { storeEncryptedWallet, storeSession } from '@/lib/storage';
import { useWallet } from '@/contexts/WalletContext';

export default function ImportWallet() {
  const { setWallet } = useWallet();
  const router = useRouter();
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [importedWallet, setImportedWallet] = useState<WalletData | null>(null);

  const validatePassword = (pwd: string): boolean => {
    return pwd.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!mnemonic.trim()) {
      setError('Please enter your recovery phrase');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Clean and validate mnemonic
    const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    
    if (!validateMnemonic(cleanMnemonic)) {
      setError('Invalid recovery phrase. Please check your words and try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Restore wallet from mnemonic
      const walletData = restoreWalletFromMnemonic(cleanMnemonic);
      
      // Encrypt and store wallet
      const encryptedWallet = encryptWallet(walletData, password);
      storeEncryptedWallet(encryptedWallet);
      
      // Create session
      storeSession(walletData.address);
      
      // Set wallet in context
      setWallet(walletData);
      setImportedWallet(walletData);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import signing identity';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWordInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMnemonic(value);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMnemonic(text);
    } catch {
      setError('Failed to paste from clipboard');
    }
  };

  if (success && importedWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
        <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 text-center">
          <div className="text-green-400 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-4 text-white">Signing Identity Imported!</h2>
          
          <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
            <p className="text-sm text-gray-400 mb-2">Your Signer ID:</p>
            <p className="font-mono text-lg text-purple-400 mb-3">{importedWallet.customId}</p>
            <p className="text-sm text-gray-400 mb-2">Your Signing Address:</p>
            <p className="font-mono text-sm break-all text-gray-300">{importedWallet.address}</p>
          </div>

          <p className="text-gray-300 mb-6">
            Your signing identity has been imported and encrypted with your new password. You can now sign documents securely on the blockchain.
          </p>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      <div className="max-w-2xl mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Import Existing Signing Identity</h2>
        
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <span className="text-blue-400 font-semibold">ℹ️ Import Instructions:</span>
          </div>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• Enter your 12 or 24-word recovery phrase in the correct order</li>
            <li>• Words should be separated by spaces</li>
            <li>• Create a new strong password to encrypt your identity locally</li>
            <li>• Your original recovery phrase will work with this new password</li>
          </ul>
        </div>

        <form onSubmit={handleImport} className="space-y-6">
          {/* Recovery Phrase Input */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Recovery Phrase (12 or 24 words)
            </label>
            <div className="relative">
              <textarea
                value={mnemonic}
                onChange={handleWordInput}
                className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-white placeholder-gray-400"
                rows={4}
                placeholder="Enter your recovery phrase here (e.g., word1 word2 word3...)"
                required
              />
              <button
                type="button"
                onClick={pasteFromClipboard}
                className="absolute top-2 right-2 bg-white/10 text-gray-300 px-3 py-1 rounded text-sm hover:bg-white/20 transition-all duration-200"
              >
                Paste
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Word count: {mnemonic.trim() ? mnemonic.trim().split(/\s+/).length : 0}
            </p>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="Create a strong password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Password requirements: At least 8 characters with uppercase, lowercase, and number
          </p>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 bg-white/10 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? 'Importing Identity...' : 'Import Identity'}
            </button>
          </div>
        </form>

        {/* Security Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-6">
          <div className="flex items-center mb-2">
            <span className="text-yellow-400 font-semibold">⚠️ Security Warning:</span>
          </div>
          <ul className="text-sm text-yellow-300 space-y-1">
            <li>• Never enter your recovery phrase on untrusted websites</li>
            <li>• Make sure you&apos;re on the correct URL and using HTTPS</li>
            <li>• Your recovery phrase will be encrypted and stored locally</li>
            <li>• Clear your browser&apos;s form data after importing for extra security</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
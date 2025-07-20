'use client';

import React, { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { removeStoredWallet, deleteWalletFromDatabase } from '@/lib/storage';
import { getChecksumAddress } from '@/lib/wallet';

export default function Dashboard() {
  const { wallet, currentUser, isAuthenticated, isLoading, logout } = useWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<{
    customId: string;
    address?: string;
    found: boolean;
  } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Clear state first
    logout();
    // Then redirect
    window.location.href = '/logout';
  };

  const handleDeleteWallet = async () => {
    if (window.confirm('Are you sure you want to delete your signing identity? This action cannot be undone. Make sure you have your recovery phrase saved.')) {
      try {
        // Delete from Supabase database
        await deleteWalletFromDatabase();
        // Remove from local storage
        removeStoredWallet();
        // Logout and redirect
        await logout();
        window.location.href = '/delete-wallet';
      } catch (error) {
        console.error('Failed to delete wallet:', error);
        alert('Failed to delete wallet. Please try again.');
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSearch = () => {
    // For demo purposes, we'll simulate a search
    // In a real app, this would query a database or API
    if (searchId === wallet?.customId) {
      setSearchResult({
        customId: wallet.customId,
        address: wallet.address,
        found: true
      });
    } else {
      setSearchResult({
        customId: searchId,
        found: false
      });
    }
  };

  // Show logging out state instead of "No Signing Identity Connected"
  if (!wallet && isLoggingOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <span className="text-white text-2xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Logging Out...</h2>
          <p className="text-gray-300">Please wait while we securely log you out.</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold mb-4 text-white">No Signing Identity Connected</h2>
          <p className="text-gray-300 mb-6">Please login to access your SignTusk identity.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">SignTusk Dashboard</h1>
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg">
                  <span className="text-white font-semibold">Signer ID: {wallet.customId}</span>
                </div>
                <div className="text-green-400 text-sm flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Connected
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleLogout}
                className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                Logout
              </button>
              <button
                onClick={handleDeleteWallet}
                className="bg-red-500/20 backdrop-blur-sm text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-all duration-200 border border-red-500/30"
              >
                Delete Identity
              </button>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Search Signer by ID</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              placeholder="Enter Signer ID (e.g., ABC1234DEFG5678)"
              maxLength={15}
              className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            />
            <button
              onClick={handleSearch}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
            >
              Search
            </button>
          </div>
          
          {searchResult && (
            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
              {searchResult.found ? (
                <div>
                  <p className="text-green-400 font-semibold mb-2">✅ Signer Found!</p>
                  <p className="text-gray-300">Signer ID: <span className="text-white font-mono">{searchResult.customId}</span></p>
                  <p className="text-gray-300">Address: <span className="text-white font-mono text-sm">{searchResult.address ? getChecksumAddress(searchResult.address) : ''}</span></p>
                </div>
              ) : (
                <p className="text-red-400">❌ No signer found with ID: <span className="font-mono">{searchResult.customId}</span></p>
              )}
            </div>
          )}
        </div>

        {/* Wallet Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Address Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Signing Address</h2>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="font-mono text-sm break-all mb-3 text-gray-300">{getChecksumAddress(wallet.address)}</p>
              <button
                onClick={() => copyToClipboard(getChecksumAddress(wallet.address))}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 text-sm"
              >
                Copy Address
              </button>
            </div>
          </div>

          {/* Balance Card (Placeholder) */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Documents Signed</h2>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-gray-400 text-sm">Total documents signed</p>
              <p className="text-xs text-gray-500 mt-2">
                Start signing documents to see your activity
              </p>
            </div>
          </div>

          {/* Private Key Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Private Key</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-300 text-sm">
                ⚠️ Never share your private key with anyone. Anyone with access to your private key can sign documents on your behalf.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              {showPrivateKey ? (
                <div>
                  <p className="font-mono text-sm break-all mb-3 text-gray-300">{wallet.privateKey}</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(wallet.privateKey)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 text-sm"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setShowPrivateKey(false)}
                      className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 text-sm"
                    >
                      Hide
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowPrivateKey(true)}
                  className="bg-red-500/20 backdrop-blur-sm text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-all duration-200 border border-red-500/30 text-sm"
                >
                  Show Private Key
                </button>
              )}
            </div>
          </div>

          {/* Recovery Phrase Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Recovery Phrase</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-300 text-sm">
                ⚠️ Your recovery phrase is the master key to your signing identity. Store it safely and never share it.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              {showMnemonic ? (
                <div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {wallet.mnemonic.split(' ').map((word: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-white/10 rounded border border-white/20">
                        <span className="text-xs text-gray-400 w-6">{index + 1}.</span>
                        <span className="font-mono text-sm text-gray-300">{word}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(wallet.mnemonic)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 text-sm"
                    >
                      Copy Phrase
                    </button>
                    <button
                      onClick={() => setShowMnemonic(false)}
                      className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 text-sm"
                    >
                      Hide
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowMnemonic(true)}
                  className="bg-red-500/20 backdrop-blur-sm text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-all duration-200 border border-red-500/30 text-sm"
                >
                  Show Recovery Phrase
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-6">Document Signing Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-green-500/20 backdrop-blur-sm text-green-300 p-6 rounded-xl hover:bg-green-500/30 transition-all duration-200 border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              <div className="text-2xl mb-2">📝</div>
              <div className="font-semibold">Sign Document</div>
              <p className="text-sm opacity-75 mt-1">Coming Soon</p>
            </button>
            <button className="bg-blue-500/20 backdrop-blur-sm text-blue-300 p-6 rounded-xl hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-semibold">Verify Signature</div>
              <p className="text-sm opacity-75 mt-1">Coming Soon</p>
            </button>
            <button className="bg-purple-500/20 backdrop-blur-sm text-purple-300 p-6 rounded-xl hover:bg-purple-500/30 transition-all duration-200 border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold">Signing History</div>
              <p className="text-sm opacity-75 mt-1">Coming Soon</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
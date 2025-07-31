'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { removeStoredWallet, deleteWalletFromDatabase } from '@/lib/storage';
import { getChecksumAddress } from '@/lib/wallet';

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: string;
  createdAt: string;
  signatureCount: number;
  metadata?: {
    title?: string;
    purpose?: string;
    signerInfo?: string;
  };
}

export default function Dashboard() {
  const { wallet, logout, getSignerId } = useWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<{
    customId: string;
    address?: string;
    found: boolean;
  } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const response = await fetch('/api/documents/history', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const transformedDocs = result.documents.map((doc: any) => ({
          id: doc.id,
          fileName: doc.file_name,
          fileSize: doc.file_size,
          fileType: doc.file_type,
          status: doc.status,
          createdAt: doc.created_at,
          signatureCount: doc.signatures?.length || 0,
          metadata: doc.metadata
        }));
        setDocuments(transformedDocs);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    logout();
    window.location.href = '/logout';
  };

  const handleDeleteWallet = async () => {
    if (window.confirm('Are you sure you want to delete your signing identity? This action cannot be undone. Make sure you have your recovery phrase saved.')) {
      try {
        await deleteWalletFromDatabase();
        removeStoredWallet();
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

  const handleCreateDocument = (model: 'single' | 'multi') => {
    setShowCreateModal(false);
    if (model === 'single') {
      window.location.href = '/sign-document';
    } else {
      window.location.href = '/multi-signature';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  // Show logging out state
  if (isLoggingOut) {
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
                  <span className="text-white font-semibold">Signer ID: {getSignerId()}</span>
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

        {/* Documents Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">My Documents</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold flex items-center space-x-2"
            >
              <span className="text-xl">+</span>
              <span>Create</span>
            </button>
          </div>

          {isLoadingDocuments ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                <span className="text-white">⏳</span>
              </div>
              <p className="text-gray-300">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
              <div className="text-6xl mb-4">📄</div>
              <h4 className="text-xl font-bold text-white mb-2">No Documents Yet</h4>
              <p className="text-gray-400 mb-6">Start by creating your first document to sign.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold"
              >
                Create Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold truncate">{doc.fileName}</h4>
                      <p className="text-gray-400 text-sm">{formatDate(doc.createdAt)}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${doc.status === 'completed'
                      ? 'bg-green-500/20 text-green-300'
                      : doc.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-gray-500/20 text-gray-300'
                      }`}>
                      {doc.status}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300 mb-4">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{doc.fileType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Signatures:</span>
                      <span>{doc.signatureCount}</span>
                    </div>
                    {doc.metadata?.title && (
                      <div className="flex justify-between">
                        <span>Title:</span>
                        <span className="truncate ml-2">{doc.metadata.title}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.location.href = `/sign-document?doc=${doc.id}`}
                      className="flex-1 bg-blue-500/20 text-blue-300 px-3 py-2 rounded text-sm hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30"
                    >
                      View
                    </button>
                    <button
                      onClick={() => window.location.href = `/verify?doc=${doc.id}`}
                      className="flex-1 bg-purple-500/20 text-purple-300 px-3 py-2 rounded text-sm hover:bg-purple-500/30 transition-all duration-200 border border-purple-500/30"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/sign-document'}
              className="bg-green-500/20 backdrop-blur-sm text-green-300 p-6 rounded-xl hover:bg-green-500/30 transition-all duration-200 border border-green-500/30"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-semibold">Sign Document</div>
              <p className="text-sm opacity-75 mt-1">Model 1.1: Single Signature</p>
            </button>
            <button
              onClick={() => window.location.href = '/multi-signature'}
              className="bg-blue-500/20 backdrop-blur-sm text-blue-300 p-6 rounded-xl hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold">Multi-Signature</div>
              <p className="text-sm opacity-75 mt-1">Model 1.2: Multiple Signatures</p>
            </button>
            <button
              onClick={() => window.location.href = '/verify'}
              className="bg-purple-500/20 backdrop-blur-sm text-purple-300 p-6 rounded-xl hover:bg-purple-500/30 transition-all duration-200 border border-purple-500/30"
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-semibold">Verify Document</div>
              <p className="text-sm opacity-75 mt-1">Verify Any Signature</p>
            </button>
          </div>
        </div>

        {/* Wallet Info - Collapsible */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <details className="group">
            <summary className="cursor-pointer text-xl font-bold text-white mb-4 list-none flex items-center justify-between">
              <span>Wallet Information</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Address Card */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Signing Address</h3>
                <div className="bg-white/5 p-3 rounded border border-white/10">
                  <p className="font-mono text-sm break-all mb-3 text-gray-300">{wallet ? getChecksumAddress(wallet.address) : 'Not available'}</p>
                  <button
                    onClick={() => wallet && copyToClipboard(getChecksumAddress(wallet.address))}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 py-2 rounded text-sm hover:from-blue-700 hover:to-cyan-700 transition-all duration-200"
                  >
                    Copy Address
                  </button>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Documents Signed:</span>
                    <span className="text-white font-semibold">{documents.filter(d => d.status === 'completed').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Documents:</span>
                    <span className="text-white font-semibold">{documents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pending:</span>
                    <span className="text-yellow-300 font-semibold">{documents.filter(d => d.status === 'pending').length}</span>
                  </div>
                </div>
              </div>

              {/* Private Key Card */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Private Key</h3>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mb-3">
                  <p className="text-yellow-300 text-xs">
                    ⚠️ Never share your private key with anyone.
                  </p>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10">
                  {showPrivateKey && wallet ? (
                    <div>
                      <p className="font-mono text-sm break-all mb-3 text-gray-300">{wallet.privateKey}</p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => wallet && copyToClipboard(wallet.privateKey)}
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 py-2 rounded text-sm hover:from-blue-700 hover:to-cyan-700 transition-all duration-200"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => setShowPrivateKey(false)}
                          className="bg-white/10 text-white px-3 py-2 rounded text-sm hover:bg-white/20 transition-all duration-200 border border-white/20"
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPrivateKey(true)}
                      className="bg-red-500/20 text-red-300 px-3 py-2 rounded text-sm hover:bg-red-500/30 transition-all duration-200 border border-red-500/30"
                    >
                      Show Private Key
                    </button>
                  )}
                </div>
              </div>

              {/* Recovery Phrase Card */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Recovery Phrase</h3>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mb-3">
                  <p className="text-yellow-300 text-xs">
                    ⚠️ Your recovery phrase is the master key to your identity.
                  </p>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/10">
                  {showMnemonic && wallet && wallet.mnemonic ? (
                    <div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {wallet.mnemonic.split(' ').map((word: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                            <span className="font-mono text-xs text-gray-300">{word}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => wallet && copyToClipboard(wallet.mnemonic)}
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 py-2 rounded text-sm hover:from-blue-700 hover:to-cyan-700 transition-all duration-200"
                        >
                          Copy Phrase
                        </button>
                        <button
                          onClick={() => setShowMnemonic(false)}
                          className="bg-white/10 text-white px-3 py-2 rounded text-sm hover:bg-white/20 transition-all duration-200 border border-white/20"
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMnemonic(true)}
                      className="bg-red-500/20 text-red-300 px-3 py-2 rounded text-sm hover:bg-red-500/30 transition-all duration-200 border border-red-500/30"
                    >
                      Show Recovery Phrase
                    </button>
                  )}
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Create Document Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 max-w-md mx-4">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Choose Signature Type</h3>

            <div className="space-y-4">
              <button
                onClick={() => handleCreateDocument('single')}
                className="w-full bg-green-500/20 backdrop-blur-sm text-green-300 p-6 rounded-xl hover:bg-green-500/30 transition-all duration-200 border border-green-500/30 text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">📝</div>
                  <div>
                    <div className="font-semibold text-lg">Model 1.1 – Single Signature</div>
                    <p className="text-sm opacity-75 mt-1">One signer, off-chain digital signature</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleCreateDocument('multi')}
                className="w-full bg-blue-500/20 backdrop-blur-sm text-blue-300 p-6 rounded-xl hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30 text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">👥</div>
                  <div>
                    <div className="font-semibold text-lg">Model 1.2 – Multi-Signature</div>
                    <p className="text-sm opacity-75 mt-1">Multiple signers, collaborative signing</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full mt-6 bg-white/10 backdrop-blur-sm text-white px-4 py-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
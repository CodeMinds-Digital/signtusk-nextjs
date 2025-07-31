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
  originalUrl?: string;
  signedUrl?: string;
  metadata?: {
    title?: string;
    purpose?: string;
    signerInfo?: string;
  };
}

interface DocumentPreviewModal {
  isOpen: boolean;
  document: Document | null;
  previewUrl: string;
  isSignedVersion: boolean;
}

interface VerifyModal {
  isOpen: boolean;
  document: Document | null;
  verificationData: any;
  isLoading: boolean;
  showDetailed: boolean;
}

interface HistoryModal {
  isOpen: boolean;
  document: Document | null;
  historyData: any[];
  isLoading: boolean;
}

export default function Dashboard() {
  const { wallet, logout, getSignerId } = useWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewModal, setPreviewModal] = useState<DocumentPreviewModal>({
    isOpen: false,
    document: null,
    previewUrl: '',
    isSignedVersion: false
  });
  const [verifyModal, setVerifyModal] = useState<VerifyModal>({
    isOpen: false,
    document: null,
    verificationData: null,
    isLoading: false,
    showDetailed: false
  });
  const [historyModal, setHistoryModal] = useState<HistoryModal>({
    isOpen: false,
    document: null,
    historyData: [],
    isLoading: false
  });

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
          originalUrl: doc.public_url,
          signedUrl: doc.signed_public_url,
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

  const handleCreateDocument = (model: 'single' | 'multi') => {
    setShowCreateModal(false);
    if (model === 'single') {
      window.location.href = '/sign-document';
    } else {
      window.location.href = '/multi-signature';
    }
  };

  const handleViewDocument = async (document: Document) => {
    let previewUrl = '';
    let isSignedVersion = false;

    if (document.status === 'completed' && document.signedUrl) {
      // Show signed PDF for completed documents
      previewUrl = document.signedUrl;
      isSignedVersion = true;
    } else if (document.originalUrl) {
      // Show original PDF for non-completed documents
      previewUrl = document.originalUrl;
      isSignedVersion = false;
    } else {
      alert('Document preview not available');
      return;
    }

    setPreviewModal({
      isOpen: true,
      document,
      previewUrl,
      isSignedVersion
    });
  };

  const handleVerifyDocument = async (document: Document) => {
    setVerifyModal({
      isOpen: true,
      document,
      verificationData: null,
      isLoading: true,
      showDetailed: false
    });

    try {
      // Fetch the signed document for verification
      const documentUrl = document.signedUrl || document.originalUrl;
      if (!documentUrl) {
        throw new Error('No document URL available for verification');
      }

      // Fetch the document file
      const fileResponse = await fetch(documentUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch document for verification');
      }

      const blob = await fileResponse.blob();
      const file = new File([blob], document.fileName, { type: document.fileType });

      // Create form data for verification API
      const formData = new FormData();
      formData.append('file', file);

      // Call verification API
      const verifyResponse = await fetch('/api/documents/verify', {
        method: 'POST',
        body: formData
      });

      if (!verifyResponse.ok) {
        throw new Error('Verification failed');
      }

      const result = await verifyResponse.json();

      setVerifyModal(prev => ({
        ...prev,
        verificationData: result.verification,
        isLoading: false
      }));

    } catch (error) {
      console.error('Error verifying document:', error);
      setVerifyModal(prev => ({
        ...prev,
        verificationData: {
          isValid: false,
          error: error instanceof Error ? error.message : 'Verification failed'
        },
        isLoading: false
      }));
    }
  };

  const handleDocumentHistory = async (document: Document) => {
    setHistoryModal({
      isOpen: true,
      document,
      historyData: [],
      isLoading: true
    });

    try {
      // Fetch document history from API
      const response = await fetch(`/api/documents/${document.id}/history`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setHistoryModal(prev => ({
          ...prev,
          historyData: result.history || [],
          isLoading: false
        }));
      } else {
        // Fallback to basic history if API doesn't exist
        const basicHistory = [
          {
            action: 'Document Created',
            timestamp: document.createdAt,
            details: `Document "${document.metadata?.title || document.fileName}" was uploaded`,
            type: 'creation'
          }
        ];

        // Add signature events if document is completed
        if (document.status === 'completed' && document.signatureCount > 0) {
          for (let i = 0; i < document.signatureCount; i++) {
            basicHistory.push({
              action: 'Document Signed',
              timestamp: document.createdAt, // Would be actual signature timestamp in real implementation
              details: `Signature ${i + 1} completed`,
              type: 'signature'
            });
          }
        }

        setHistoryModal(prev => ({
          ...prev,
          historyData: basicHistory,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Error loading document history:', error);
      setHistoryModal(prev => ({
        ...prev,
        historyData: [],
        isLoading: false
      }));
    }
  };

  const handleDetailedVerification = () => {
    if (verifyModal.document) {
      // Option 1: Show detailed info in same popup
      setVerifyModal(prev => ({
        ...prev,
        showDetailed: true
      }));

      // Option 2: Redirect to full verification page (uncomment to use)
      // window.location.href = `/verify?doc=${verifyModal.document.id}`;
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
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'completed': { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Completed' },
      'pending': { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'In Progress' },
      'rejected': { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Rejected' },
      'draft': { bg: 'bg-gray-500/20', text: 'text-gray-300', label: 'Draft' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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
      <div className="max-w-7xl mx-auto px-4 py-8">
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

        {/* My Documents Section */}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white font-semibold">Document Title</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Created Date</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Size</th>
                    <th className="text-center py-3 px-4 text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-white/10 hover:bg-white/5 transition-all duration-200">
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">{doc.metadata?.title || doc.fileName}</p>
                          <p className="text-gray-400 text-sm">{doc.fileName}</p>
                          {doc.metadata?.purpose && (
                            <p className="text-gray-500 text-xs mt-1">{doc.metadata.purpose}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-gray-300">{formatDate(doc.createdAt)}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-gray-300">{formatFileSize(doc.fileSize)}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleViewDocument(doc)}
                            className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30 font-medium"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(doc)}
                            className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded text-sm hover:bg-purple-500/30 transition-all duration-200 border border-purple-500/30 font-medium"
                          >
                            ✅ Verify
                          </button>
                          <button
                            onClick={() => handleDocumentHistory(doc)}
                            className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded text-sm hover:bg-orange-500/30 transition-all duration-200 border border-orange-500/30 font-medium"
                          >
                            📋 History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <p className="font-mono text-sm break-all mb-3 text-gray-300">{getChecksumAddress(wallet!.address)}</p>
                  <button
                    onClick={() => copyToClipboard(getChecksumAddress(wallet!.address))}
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
                    <span className="text-gray-400">In Progress:</span>
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
                  {showPrivateKey ? (
                    <div>
                      <p className="font-mono text-sm break-all mb-3 text-gray-300">{wallet!.privateKey}</p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyToClipboard(wallet!.privateKey)}
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
                  {showMnemonic ? (
                    <div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {wallet!.mnemonic.split(' ').map((word: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                            <span className="font-mono text-xs text-gray-300">{word}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyToClipboard(wallet!.mnemonic)}
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

      {/* Document Preview Modal */}
      {previewModal.isOpen && previewModal.document && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {previewModal.isSignedVersion ? '📄 Signed Document' : '📄 Original Document'}
                </h3>
                <p className="text-gray-300">{previewModal.document.metadata?.title || previewModal.document.fileName}</p>
              </div>
              <button
                onClick={() => setPreviewModal({ isOpen: false, document: null, previewUrl: '', isSignedVersion: false })}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                ✕ Close
              </button>
            </div>

            <div className="bg-white rounded-lg p-4 h-96">
              <iframe
                src={previewModal.previewUrl}
                className="w-full h-full border-0 rounded"
                title="Document Preview"
              />
            </div>

            <div className="mt-4 flex space-x-3">
              <a
                href={previewModal.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 text-sm font-semibold"
              >
                📥 Download
              </a>
              {previewModal.isSignedVersion && (
                <button
                  onClick={() => handleVerifyDocument(previewModal.document!)}
                  className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition-all duration-200 border border-purple-500/30 text-sm font-semibold"
                >
                  ✅ Verify Signatures
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal - Basic + Detailed */}
      {verifyModal.isOpen && verifyModal.document && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                🔍 {verifyModal.showDetailed ? 'Detailed Verification' : 'Document Verification'}
              </h3>
              <button
                onClick={() => setVerifyModal({ isOpen: false, document: null, verificationData: null, isLoading: false, showDetailed: false })}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                ✕ Close
              </button>
            </div>

            {verifyModal.isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                  <span className="text-white">⏳</span>
                </div>
                <p className="text-gray-300">Verifying document...</p>
              </div>
            ) : verifyModal.verificationData ? (
              <div className="space-y-4">
                {/* Basic Verification Status */}
                <div className={`p-4 rounded-lg border ${verifyModal.verificationData.isValid
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
                  }`}>
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">
                      {verifyModal.verificationData.isValid ? '✅' : '❌'}
                    </span>
                    <h4 className={`text-lg font-bold ${verifyModal.verificationData.isValid ? 'text-green-300' : 'text-red-300'
                      }`}>
                      {verifyModal.verificationData.isValid ? 'Signature Valid' : 'Signature Invalid'}
                    </h4>
                  </div>
                </div>

                {/* Basic Document Info */}
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <h5 className="text-white font-semibold mb-3">📄 Document Information</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Document:</span>
                      <span className="text-white">{verifyModal.document.metadata?.title || verifyModal.document.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-white">{verifyModal.document.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Signatures:</span>
                      <span className="text-white">{verifyModal.verificationData.details?.total_signatures || 0}</span>
                    </div>
                    {verifyModal.verificationData.details?.documentHash && (
                      <div>
                        <span className="text-gray-400">Document Hash:</span>
                        <p className="font-mono text-xs text-gray-300 break-all bg-black/20 p-2 rounded mt-1">
                          {verifyModal.verificationData.details.documentHash}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Signature Info */}
                {verifyModal.verificationData.details?.signatures && verifyModal.verificationData.details.signatures.length > 0 && (
                  <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <h5 className="text-white font-semibold mb-3">✍��� Signers</h5>
                    <div className="space-y-2">
                      {verifyModal.verificationData.details.signatures.slice(0, verifyModal.showDetailed ? undefined : 2).map((sig: any, index: number) => (
                        <div key={index} className="flex justify-between items-center bg-black/20 rounded p-2">
                          <div>
                            <p className="text-white font-medium">{sig.signerName || sig.signerId || 'Unknown'}</p>
                            <p className="text-gray-400 text-xs">{sig.timestamp ? new Date(sig.timestamp).toLocaleString() : 'Unknown time'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${sig.isValid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {sig.isValid ? 'Valid' : 'Invalid'}
                          </span>
                        </div>
                      ))}
                      {!verifyModal.showDetailed && verifyModal.verificationData.details.signatures.length > 2 && (
                        <p className="text-gray-400 text-sm">+{verifyModal.verificationData.details.signatures.length - 2} more signatures</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Detailed Information (shown when showDetailed is true) */}
                {verifyModal.showDetailed && (
                  <>
                    {/* Detailed Signature Information */}
                    {verifyModal.verificationData.details?.signatures && verifyModal.verificationData.details.signatures.length > 0 && (
                      <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                        <h5 className="text-white font-semibold mb-3">📋 Signature Details</h5>
                        <div className="space-y-4">
                          {verifyModal.verificationData.details.signatures.map((sig: any, index: number) => (
                            <div key={index} className="bg-black/20 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-400">Signer ID:</span>
                                  <p className="text-white font-semibold">{sig.signerId || 'Unknown'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Signer Name:</span>
                                  <p className="text-white">{sig.signerName || 'Unknown'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Signing Timestamp:</span>
                                  <p className="text-white">{sig.timestamp ? new Date(sig.timestamp).toLocaleString() : 'Unknown time'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Signature Validity:</span>
                                  <span className={`px-2 py-1 rounded text-xs ${sig.isValid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                    {sig.isValid ? '✅ Valid' : '❌ Invalid'}
                                  </span>
                                </div>
                                {sig.signature && (
                                  <div className="md:col-span-2">
                                    <span className="text-gray-400">Full Cryptographic Signature:</span>
                                    <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded mt-1">
                                      {sig.signature}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Document Metadata */}
                    {verifyModal.verificationData.details?.metadata && (
                      <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                        <h5 className="text-white font-semibold mb-3">📄 Document Metadata</h5>
                        <div className="space-y-2 text-sm">
                          {verifyModal.verificationData.details.metadata.title && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Title:</span>
                              <span className="text-white">{verifyModal.verificationData.details.metadata.title}</span>
                            </div>
                          )}
                          {verifyModal.verificationData.details.metadata.purpose && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Purpose:</span>
                              <span className="text-white">{verifyModal.verificationData.details.metadata.purpose}</span>
                            </div>
                          )}
                          {verifyModal.verificationData.details.metadata.signerInfo && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Signer Information:</span>
                              <span className="text-white">{verifyModal.verificationData.details.metadata.signerInfo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technical Details */}
                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <h5 className="text-white font-semibold mb-3">🔧 Technical Details</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Verification Method:</span>
                          <span className="text-white">{verifyModal.verificationData.details?.verification_method || 'Standard'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Is Signed PDF:</span>
                          <span className="text-white">{verifyModal.verificationData.details?.isSignedPDF ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Valid Signatures:</span>
                          <span className="text-green-300">{verifyModal.verificationData.details?.valid_signatures || 0}</span>
                        </div>
                        {verifyModal.verificationData.details?.originalHash && (
                          <div>
                            <span className="text-gray-400">Original Hash:</span>
                            <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded mt-1">
                              {verifyModal.verificationData.details.originalHash}
                            </p>
                          </div>
                        )}
                        {verifyModal.verificationData.details?.signedHash && verifyModal.verificationData.details.signedHash !== verifyModal.verificationData.details.originalHash && (
                          <div>
                            <span className="text-gray-400">Signed Hash:</span>
                            <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded mt-1">
                              {verifyModal.verificationData.details.signedHash}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Document Preview */}
                    {verifyModal.document && verifyModal.document.signedUrl && (
                      <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                        <h5 className="text-white font-semibold mb-3">📄 Document Preview</h5>
                        <div className="bg-white rounded-lg p-4">
                          <iframe
                            src={verifyModal.document.signedUrl}
                            className="w-full h-96 border-0 rounded"
                            title="Verified Document Preview"
                          />
                        </div>
                        <div className="mt-4 flex space-x-3">
                          <a
                            href={verifyModal.document.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 text-sm font-semibold"
                          >
                            📥 Download Document
                          </a>
                          {verifyModal.verificationData.details?.documentHash && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(verifyModal.verificationData.details.documentHash);
                                // You could add a toast notification here
                              }}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-200 text-sm font-semibold"
                            >
                              📋 Copy Hash
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Audit Trail */}
                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <h5 className="text-white font-semibold mb-3">📊 Audit Trail</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Document Created:</span>
                          <span className="text-white">{formatDate(verifyModal.document.createdAt)}</span>
                        </div>
                        {verifyModal.verificationData.details?.signatures?.map((sig: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-gray-400">Signature {index + 1}:</span>
                            <span className="text-white">{sig.timestamp ? formatDate(sig.timestamp) : 'Unknown'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verification Summary */}
                    {verifyModal.verificationData.isValid && (
                      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-6">
                        <h4 className="text-lg font-bold text-green-300 mb-3">✅ Verification Summary</h4>
                        <div className="space-y-2 text-sm text-green-200">
                          <p>• Document signature has been cryptographically verified</p>
                          <p>• Document integrity is confirmed - no tampering detected</p>
                          <p>• Signer identity has been validated against blockchain records</p>
                          <p>• Timestamp verification confirms signing date and time</p>
                          <p>• This document can be trusted as authentic and unmodified</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Error */}
                {verifyModal.verificationData.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-300">{verifyModal.verificationData.error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  {!verifyModal.showDetailed && (
                    <button
                      onClick={handleDetailedVerification}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-sm font-semibold"
                    >
                      🔍 Detailed Verification
                    </button>
                  )}
                  <button
                    onClick={() => window.location.href = '/verify'}
                    className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 text-sm"
                  >
                    🌐 Full Verification Page
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-300">Failed to load verification data</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal.isOpen && historyModal.document && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📋 Document History</h3>
              <button
                onClick={() => setHistoryModal({ isOpen: false, document: null, historyData: [], isLoading: false })}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                ✕ Close
              </button>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white">{historyModal.document.metadata?.title || historyModal.document.fileName}</h4>
              <p className="text-gray-400 text-sm">Document ID: {historyModal.document.id}</p>
            </div>

            {historyModal.isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                  <span className="text-white">⏳</span>
                </div>
                <p className="text-gray-300">Loading document history...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyModal.historyData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No history data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyModal.historyData.map((event, index) => (
                      <div key={index} className="bg-white/5 rounded-lg border border-white/10 p-4">
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${event.type === 'creation'
                            ? 'bg-blue-500/20 text-blue-300'
                            : event.type === 'signature'
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-gray-500/20 text-gray-300'
                            }`}>
                            {event.type === 'creation' ? '📄' : event.type === 'signature' ? '✍️' : '📋'}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="text-white font-semibold">{event.action}</h5>
                                <p className="text-gray-300 text-sm">{event.details}</p>
                              </div>
                              <span className="text-gray-400 text-xs">{formatDate(event.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
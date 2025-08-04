'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, StatusIndicator } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';
import { SettingsRedesigned } from './SettingsRedesigned';
import { DocumentsRedesigned } from './DocumentsRedesigned';
import { VerifyRedesigned } from './VerifyRedesigned';
import { DocumentPreviewModal } from './DocumentPreviewModal';

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
  metadata?: any;
}

interface DashboardStats {
  totalDocuments: number;
  signedDocuments: number;
  pendingDocuments: number;
  verifiedDocuments: number;
}

export const DashboardEnhanced: React.FC = () => {
  const { wallet, currentUser, logout } = useWallet();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    signedDocuments: 0,
    pendingDocuments: 0,
    verifiedDocuments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    document: Document | null;
    previewUrl: string;
    isSignedVersion: boolean;
  }>({
    isOpen: false,
    document: null,
    previewUrl: '',
    isSignedVersion: false,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
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
        // Calculate pending documents including multi-signature documents that need user action
        const pendingDocs = transformedDocs.filter((d: any) => {
          if (d.status === 'pending') {
            // For multi-signature documents, check if user can sign
            if (d.metadata?.type === 'multi-signature') {
              return d.metadata?.progress?.completed < d.metadata?.progress?.total;
            }
            return true;
          }
          return false;
        });

        setStats({
          totalDocuments: transformedDocs.length,
          signedDocuments: transformedDocs.filter((d: any) => d.status === 'completed').length,
          pendingDocuments: pendingDocs.length,
          verifiedDocuments: transformedDocs.filter((d: any) => d.status === 'verified').length,
        });
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
      setStats({
        totalDocuments: 0,
        signedDocuments: 0,
        pendingDocuments: 0,
        verifiedDocuments: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    router.push('/logout');
  };

  const handlePageChange = (page: string) => {
    console.log('Page change requested:', page);
    setCurrentPage(page);
  };

  // Render different pages based on currentPage
  console.log('Current page state:', currentPage);

  if (currentPage === 'settings') {
    return <SettingsRedesigned onPageChange={handlePageChange} />;
  }

  if (currentPage === 'documents') {
    return <DocumentsRedesigned onPageChange={handlePageChange} />;
  }

  if (currentPage === 'verify') {
    return <VerifyRedesigned onPageChange={handlePageChange} />;
  }

  const handleViewDocument = async (document: Document) => {
    let previewUrl = '';
    let isSignedVersion = false;

    // Debug logging for document URLs
    console.log('Document preview debug:', {
      id: document.id,
      status: document.status,
      signedUrl: document.signedUrl,
      originalUrl: document.originalUrl,
      metadata: document.metadata
    });

    // Debug logging for multi-signature documents
    if (document.metadata?.type === 'multi-signature') {
      console.log('🔍 Multi-signature document preview debug:', {
        id: document.id,
        status: document.status,
        signedUrl: document.signedUrl,
        originalUrl: document.originalUrl,
        metadata: document.metadata
      });
    }

    if (document.status === 'completed' && document.signedUrl) {
      // Show signed PDF for completed documents
      previewUrl = document.signedUrl;
      isSignedVersion = true;
      console.log('✅ Using signed PDF:', previewUrl);
    } else if (document.originalUrl) {
      // Show original PDF for non-completed documents
      previewUrl = document.originalUrl;
      isSignedVersion = false;
      console.log('📄 Using original PDF:', previewUrl);
    } else {
      console.error('❌ No preview URL available for document:', document);
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

  const handleVerifyDocument = (document: Document) => {
    // Check if this is a multi-signature document
    if (document.metadata?.type === 'multi-signature') {
      // For multi-signature documents, route to multi-signature verification
      const multiSigRequestId = document.metadata?.multi_signature_request_id || document.id.replace('ms_', '');
      router.push(`/multi-signature/verify/${multiSigRequestId}`);
    } else if (document.id.startsWith('ms_')) {
      // Handle legacy multi-signature documents with ms_ prefix
      const actualDocumentId = document.id.replace('ms_', '');
      const multiSigRequestId = document.metadata?.multi_signature_request_id || actualDocumentId;
      router.push(`/multi-signature/verify/${multiSigRequestId}`);
    } else {
      // For single signature documents, navigate to verify tab in sidebar
      setCurrentPage('verify');
      // Store document context for verify page
      sessionStorage.setItem('verifyDocumentContext', JSON.stringify({
        documentId: document.id,
        fileName: document.fileName
      }));
    }
  };

  const handleDocumentClick = (document: Document) => {
    // Navigate to appropriate page based on document type
    if (document.metadata?.type === 'multi-signature') {
      const multiSigRequestId = document.metadata?.multi_signature_request_id || document.id.replace('ms_', '');
      router.push(`/multi-signature/verify/${multiSigRequestId}`);
    } else {
      // Main click handler for document rows - shows modal with audit log
      handleViewDocument(document);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'signed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'verified':
        return 'text-blue-400';
      default:
        return 'text-neutral-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'signed':
        return <SecurityIcons.Verified className="w-4 h-4" />;
      case 'pending':
        return <SecurityIcons.Activity className="w-4 h-4" />;
      case 'verified':
        return <SecurityIcons.Shield className="w-4 h-4" />;
      default:
        return <SecurityIcons.Document className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onLogout={handleLogout}
        userInfo={{
          customId: currentUser?.custom_id || 'Unknown',
          address: wallet?.address || ''
        }}
      />

      {/* Main Content - Fixed sidebar overlap with proper margin */}
      <div className="lg:ml-64">
        {/* Desktop Header with Tower Symbol */}
        <div className="hidden lg:flex items-center justify-between h-16 px-6 bg-neutral-900/30 backdrop-blur-sm border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <SecurityIcons.Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Dashboard</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-neutral-400 text-sm">
              Welcome, {currentUser?.custom_id || 'User'}
            </span>
          </div>
        </div>

        <main className="p-6">
          {/* Header */}
          <div className="mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-neutral-400">
              Welcome back, {currentUser?.custom_id || 'User'}. Manage your documents and signatures securely.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card variant="glass" padding="lg" hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-400 text-sm">Total Documents</p>
                  <p className="text-2xl font-bold text-white">{stats.totalDocuments}</p>
                </div>
                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <SecurityIcons.Document className="w-6 h-6 text-primary-400" />
                </div>
              </div>
            </Card>

            <Card variant="glass" padding="lg" hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-400 text-sm">Signed Documents</p>
                  <p className="text-2xl font-bold text-white">{stats.signedDocuments}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <SecurityIcons.Verified className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </Card>

            <Card variant="glass" padding="lg" hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-400 text-sm">Pending Signatures</p>
                  <p className="text-2xl font-bold text-white">{stats.pendingDocuments}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <SecurityIcons.Activity className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </Card>

            <Card variant="glass" padding="lg" hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-400 text-sm">Verified Documents</p>
                  <p className="text-2xl font-bold text-white">{stats.verifiedDocuments}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <SecurityIcons.Shield className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Document Signing Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card variant="glass" padding="lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <SecurityIcons.Signature className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Sign Document</h3>
                  <p className="text-neutral-400 text-sm">Secure digital document signing</p>
                </div>
              </div>
              <Button
                fullWidth
                variant="primary"
                onClick={() => {
                  console.log('Sign Document button clicked, navigating to /sign-document');
                  router.push('/sign-document');
                }}
                icon={<SecurityIcons.Signature className="w-4 h-4" />}
              >
                Start Signing
              </Button>
            </Card>

            <Card variant="glass" padding="lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <SecurityIcons.Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Multi-Signature</h3>
                  <p className="text-neutral-400 text-sm">Collaborative document signing</p>
                </div>
              </div>
              <Button
                fullWidth
                variant="primary"
                onClick={() => {
                  console.log('Multi-Signature button clicked, navigating to /multi-signature');
                  router.push('/multi-signature');
                }}
                icon={<SecurityIcons.Shield className="w-4 h-4" />}
              >
                Create Workflow
              </Button>
            </Card>
          </div>

          {/* Recent Documents */}
          <Card variant="glass" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Documents</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage('documents')}
                icon={<SecurityIcons.Document className="w-4 h-4" />}
              >
                View All
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-neutral-400">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <SecurityIcons.Document className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-400 mb-2">No documents found</h3>
                <p className="text-neutral-500 mb-4">Start by signing your first document</p>
                <Button onClick={() => router.push('/sign-document')}>
                  Sign Document
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.slice(0, 5).map((document) => (
                  <div
                    key={document.id}
                    className="p-4 rounded-xl border border-neutral-600 hover:border-primary-500 bg-neutral-800/30 hover:bg-neutral-800/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center space-x-4 flex-1 cursor-pointer"
                        onClick={() => handleDocumentClick(document)}
                      >
                        <div className="w-12 h-12 bg-neutral-700/50 rounded-xl flex items-center justify-center">
                          <SecurityIcons.Document className="w-6 h-6 text-neutral-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white hover:text-primary-300 transition-colors">
                            {document.fileName}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-neutral-400">
                            <span>{formatFileSize(document.fileSize)}</span>
                            <span>{formatDate(document.createdAt)}</span>
                            {document.metadata?.type === 'multi-signature' ? (
                              <span className="text-blue-400">
                                Multi-Sig: {document.metadata.progress?.completed || 0}/{document.metadata.progress?.total || 0} signatures
                              </span>
                            ) : (
                              <span>{document.signatureCount} signature{document.signatureCount !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center space-x-1 ${getStatusColor(document.status)}`}>
                          {getStatusIcon(document.status)}
                          <span className="text-sm font-medium capitalize">{document.status}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDocument(document);
                            }}
                            icon={<SecurityIcons.Activity className="w-4 h-4" />}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, document: null, previewUrl: '', isSignedVersion: false })}
        document={previewModal.document}
        previewUrl={previewModal.previewUrl}
        isSignedVersion={previewModal.isSignedVersion}
        onNavigateToVerify={handleVerifyDocument}
      />
    </div>
  );
};

export default DashboardEnhanced;

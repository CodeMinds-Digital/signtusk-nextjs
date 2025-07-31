'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';

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

interface DocumentsRedesignedProps {
  onPageChange?: (page: string) => void;
}

export const DocumentsRedesigned: React.FC<DocumentsRedesignedProps> = ({ onPageChange }) => {
  const { wallet, currentUser, logout } = useWallet();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');

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
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    router.push('/logout');
  };

  const handlePageChange = (page: string) => {
    console.log('DocumentsRedesigned handlePageChange called with:', page, 'onPageChange available:', !!onPageChange);

    if (onPageChange) {
      // Use the callback from parent component (dashboard sidebar navigation)
      onPageChange(page);
    } else {
      // Fallback to router navigation if no callback (standalone documents page)
      if (page === 'dashboard') {
        router.push('/dashboard');
      } else if (page === 'verify') {
        router.push('/verify');
      } else if (page === 'settings') {
        router.push('/dashboard'); // Navigate back to dashboard
      }
    }
  };

  const handleViewDocument = (document: Document) => {
    // Navigate to document detail view
    router.push(`/documents/${document.id}`);
  };

  const handleVerifyDocument = (document: Document) => {
    router.push(`/verify?document=${document.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'signed':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'verified':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default:
        return 'text-neutral-400 bg-neutral-500/20 border-neutral-500/30';
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

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.fileName.localeCompare(b.fileName);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

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
        <main className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Documents</h1>
                <p className="text-neutral-400">
                  Manage and view all your signed documents and their verification status.
                </p>
              </div>
              <Button
                onClick={() => router.push('/sign-document')}
                icon={<SecurityIcons.Signature className="w-4 h-4" />}
              >
                Sign New Document
              </Button>
            </div>
          </div>

          {/* Filters and Search */}
          <Card variant="glass" padding="lg" className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <SecurityIcons.Document className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-800/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-neutral-800/50 border border-neutral-600 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'status')}
                  className="px-4 py-3 bg-neutral-800/50 border border-neutral-600 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all duration-200"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Documents List */}
          <Card variant="glass" padding="lg">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-neutral-400">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <SecurityIcons.Document className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-400 mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'No documents match your filters' : 'No documents found'}
                </h3>
                <p className="text-neutral-500 mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Start by signing your first document'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => router.push('/sign-document')}>
                    Sign Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-neutral-400 border-b border-neutral-700">
                  <div className="col-span-4">Document</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Actions</div>
                </div>

                {/* Document Rows */}
                {filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="p-4 rounded-xl border border-neutral-600 hover:border-primary-500 bg-neutral-800/30 hover:bg-neutral-800/50 transition-all duration-200"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Document Info */}
                      <div className="md:col-span-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-neutral-700/50 rounded-lg flex items-center justify-center">
                            <SecurityIcons.Document className="w-5 h-5 text-neutral-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{document.fileName}</h3>
                            <p className="text-sm text-neutral-400">
                              {document.signatureCount} signature{document.signatureCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="md:col-span-2">
                        <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(document.status)}`}>
                          {getStatusIcon(document.status)}
                          <span className="capitalize">{document.status}</span>
                        </div>
                      </div>

                      {/* Size */}
                      <div className="md:col-span-2">
                        <span className="text-sm text-neutral-300">{formatFileSize(document.fileSize)}</span>
                      </div>

                      {/* Date */}
                      <div className="md:col-span-2">
                        <span className="text-sm text-neutral-300">{formatDate(document.createdAt)}</span>
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-2">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDocument(document)}
                            icon={<SecurityIcons.Activity className="w-4 h-4" />}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyDocument(document)}
                            icon={<SecurityIcons.Verified className="w-4 h-4" />}
                          >
                            Verify
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
    </div>
  );
};

export default DocumentsRedesigned;

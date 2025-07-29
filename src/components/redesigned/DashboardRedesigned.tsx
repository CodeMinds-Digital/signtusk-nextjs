'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { Navigation } from '../ui/Navigation';
import { Card, DocumentCard, SecurityCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, StatusIndicator, SecurityLevelBadge } from '../ui/DesignSystem';

interface Document {
  id: string;
  title: string;
  status: 'pending' | 'signed' | 'verified' | 'error';
  timestamp: string;
  signers: string[];
  type: string;
}

export const DashboardRedesigned: React.FC = () => {
  const { wallet } = useWallet();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    signedDocuments: 0,
    pendingDocuments: 0,
    verifiedDocuments: 0,
  });

  useEffect(() => {
    // Mock data - replace with actual API calls
    const mockDocuments: Document[] = [
      {
        id: '1',
        title: 'Service Agreement Contract.pdf',
        status: 'verified',
        timestamp: '2 hours ago',
        signers: ['John Doe', 'Jane Smith'],
        type: 'Contract'
      },
      {
        id: '2',
        title: 'NDA Document.pdf',
        status: 'signed',
        timestamp: '1 day ago',
        signers: ['Alice Johnson'],
        type: 'Legal'
      },
      {
        id: '3',
        title: 'Partnership Agreement.pdf',
        status: 'pending',
        timestamp: '3 days ago',
        signers: ['Bob Wilson', 'Carol Brown', 'David Lee'],
        type: 'Partnership'
      },
    ];

    setDocuments(mockDocuments);
    setStats({
      totalDocuments: mockDocuments.length,
      signedDocuments: mockDocuments.filter(d => d.status === 'signed').length,
      pendingDocuments: mockDocuments.filter(d => d.status === 'pending').length,
      verifiedDocuments: mockDocuments.filter(d => d.status === 'verified').length,
    });
  }, []);

  const handleLogout = () => {
    router.push('/logout');
  };

  const handleCreateDocument = () => {
    router.push('/sign-document');
  };

  const handleViewDocument = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center">
            <SecurityIcons.Lock className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-white">Authentication Required</h2>
            <p className="text-neutral-300 mb-6">Please sign in to access your SignTusk dashboard.</p>
            <Button
              onClick={() => router.push('/login')}
              fullWidth
            >
              Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPath="/dashboard"
        userInfo={{
          customId: wallet.customId,
          address: wallet.address,
          securityLevel: 'enhanced' // This should come from user settings
        }}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-neutral-400">Manage your secure document signing workflows</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button
                  onClick={handleCreateDocument}
                  icon={<SecurityIcons.Document className="w-5 h-5" />}
                  size="lg"
                >
                  Create Document
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card variant="glass" padding="md" glow glowColor="primary">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-primary-500/20">
                  <SecurityIcons.Document className="w-6 h-6 text-primary-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-400">Total Documents</p>
                  <p className="text-2xl font-bold text-white">{stats.totalDocuments}</p>
                </div>
              </div>
            </Card>

            <Card variant="glass" padding="md" glow glowColor="success">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <SecurityIcons.Verified className="w-6 h-6 text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-400">Verified</p>
                  <p className="text-2xl font-bold text-white">{stats.verifiedDocuments}</p>
                </div>
              </div>
            </Card>

            <Card variant="glass" padding="md" glow glowColor="primary">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <SecurityIcons.Signature className="w-6 h-6 text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-400">Signed</p>
                  <p className="text-2xl font-bold text-white">{stats.signedDocuments}</p>
                </div>
              </div>
            </Card>

            <Card variant="glass" padding="md" glow glowColor="warning">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-yellow-500/20">
                  <SecurityIcons.Activity className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-400">Pending</p>
                  <p className="text-2xl font-bold text-white">{stats.pendingDocuments}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SecurityCard
              title="Single Signature"
              description="Sign documents with your digital identity"
              icon={<SecurityIcons.Signature className="w-6 h-6 text-primary-400" />}
              securityLevel="enhanced"
              hover
              className="cursor-pointer"
              onClick={() => router.push('/sign-document')}
            >
              <Button variant="outline" fullWidth>
                Start Signing
              </Button>
            </SecurityCard>

            <SecurityCard
              title="Multi-Signature"
              description="Collaborate with multiple signers"
              icon={<SecurityIcons.Shield className="w-6 h-6 text-blue-400" />}
              securityLevel="enhanced"
              hover
              className="cursor-pointer"
              onClick={() => router.push('/multi-signature')}
            >
              <Button variant="outline" fullWidth>
                Create Workflow
              </Button>
            </SecurityCard>


          </div>

          {/* Recent Documents */}
          <Card variant="glass" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Documents</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/documents')}
              >
                View All
              </Button>
            </div>

            <div className="space-y-4">
              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  title={document.title}
                  status={document.status}
                  timestamp={document.timestamp}
                  signers={document.signers}
                  onClick={() => handleViewDocument(document.id)}
                />
              ))}
            </div>

            {documents.length === 0 && (
              <div className="text-center py-12">
                <SecurityIcons.Document className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-400 mb-2">No documents yet</h3>
                <p className="text-neutral-500 mb-4">Create your first secure document to get started</p>
                <Button onClick={handleCreateDocument}>
                  Create Document
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardRedesigned;

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';
import { MultiSignatureUpload } from '../multi-signature/MultiSignatureUpload';
import { MultiSignatureStatus } from '../multi-signature/MultiSignatureStatus';
import { MultiSignatureSign } from '../multi-signature/MultiSignatureSign';

interface MultiSignatureRequest {
  id: string;
  status: 'pending' | 'completed' | 'rejected';
  description?: string;
  created_at: string;
  completed_at?: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  documents?: {
    file_name: string;
    file_size: number;
    public_url: string;
  };
  document?: {
    file_name: string;
    file_size: number;
    public_url: string;
  };
  userCanSign: boolean;
  role: 'initiator' | 'signer';
  currentSigner?: {
    customId: string;
    order: number;
  };
}

export const MultiSignatureEnhanced: React.FC = () => {
  const router = useRouter();
  const { wallet, isAuthenticated } = useWallet();

  const [activeTab, setActiveTab] = useState<'create' | 'pending' | 'status' | 'history'>('create');
  const [multiSignRequests, setMultiSignRequests] = useState<MultiSignatureRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'status' | 'sign'>('list');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !wallet) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, wallet, router]);

  // Fetch user's multi-signature requests
  const fetchMultiSignRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/multi-signature/my-requests', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Ensure each request has a valid document structure
          const validatedRequests = (result.requests || []).map((request: any) => ({
            ...request,
            document: request.document || request.documents || { file_name: 'Unknown Document', file_size: 0, public_url: '' }
          }));
          setMultiSignRequests(validatedRequests);
        } else {
          console.error('API returned error:', result.error);
        }
      } else {
        console.error('HTTP error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching multi-signature requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'create') {
      fetchMultiSignRequests();
    }
  }, [activeTab]);

  // Handle upload completion
  const handleUploadComplete = (result: any) => {
    if (result.success) {
      // Switch to pending tab to show the new request
      setActiveTab('pending');
      fetchMultiSignRequests();
    }
  };

  // Handle view request details
  const handleViewRequest = (requestId: string, mode: 'status' | 'sign' = 'status') => {
    setSelectedRequestId(requestId);
    setViewMode(mode);
    setActiveTab('status');
  };

  // Handle fix status for stuck requests
  const handleFixStatus = async (requestId: string) => {
    try {
      const response = await fetch(`/api/multi-signature/${requestId}/fix-status`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Status fix result:', result);
          // Refresh the requests list
          fetchMultiSignRequests();
          alert(result.message);
        } else {
          alert('Failed to fix status: ' + result.error);
        }
      } else {
        alert('Failed to fix status: HTTP ' + response.status);
      }
    } catch (error) {
      console.error('Error fixing status:', error);
      alert('Error fixing status: ' + error);
    }
  };

  // Handle manual PDF generation for completed requests
  const handleGenerateFinalPDF = async (requestId: string) => {
    try {
      console.log('🔄 Triggering manual PDF generation for:', requestId);
      const response = await fetch(`/api/multi-signature/${requestId}/generate-final-pdf`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ PDF generation result:', result);
          // Refresh the requests list
          fetchMultiSignRequests();
          alert(`Final PDF generated successfully! URL: ${result.signedPdfUrl}`);
        } else {
          alert('Failed to generate PDF: ' + result.error);
        }
      } else {
        const errorText = await response.text();
        alert('Failed to generate PDF: HTTP ' + response.status + ' - ' + errorText);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error);
    }
  };

  // Handle back to list
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedRequestId(null);
    setActiveTab('pending');
    fetchMultiSignRequests();
  };

  // Handle sign completion
  const handleSignComplete = (result: any) => {
    if (result.success) {
      // Refresh the requests list
      fetchMultiSignRequests();
      // Stay in status view to show updated progress
      setViewMode('status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'rejected':
        return 'text-red-400';
      default:
        return 'text-neutral-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <SecurityIcons.Verified className="w-5 h-5 text-green-400" />;
      case 'pending':
        return <SecurityIcons.Clock className="w-5 h-5 text-yellow-400" />;
      case 'rejected':
        return <SecurityIcons.X className="w-5 h-5 text-red-400" />;
      default:
        return <SecurityIcons.Clock className="w-5 h-5 text-neutral-400" />;
    }
  };

  if (!isAuthenticated || !wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPage="multi-signature"
        onLogout={() => router.push('/logout')}
        userInfo={{
          customId: wallet?.customId || 'Unknown',
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
            <span className="text-lg font-semibold text-white">Multi-Signature Documents</span>
          </div>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            size="sm"
            icon={<SecurityIcons.ArrowLeft className="w-4 h-4" />}
          >
            Dashboard
          </Button>
        </div>

        <main className="p-6">
          {/* Header - Mobile Only */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Multi-Signature Documents</h1>
                <p className="text-neutral-400">Collaborative document signing workflow</p>
              </div>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                icon={<SecurityIcons.ArrowLeft className="w-4 h-4" />}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          {viewMode === 'list' && (
            <Card variant="glass" padding="none" className="mb-8">
              <div className="flex border-b border-white/10">
                {[
                  { key: 'create', label: 'Create Request', icon: SecurityIcons.Plus },
                  { key: 'pending', label: 'Pending Actions', icon: SecurityIcons.Clock },
                  { key: 'history', label: 'All Documents', icon: SecurityIcons.Document }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-all duration-200 ${activeTab === key
                      ? 'text-primary-400 border-b-2 border-primary-400 bg-primary-500/10'
                      : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/5'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Content Area */}
          {viewMode === 'status' && selectedRequestId && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleBackToList}
                  variant="outline"
                  icon={<SecurityIcons.ArrowLeft className="w-4 h-4" />}
                >
                  Back to List
                </Button>
                <h2 className="text-xl font-semibold text-white">Document Status</h2>
              </div>
              <MultiSignatureStatus
                multiSignatureId={selectedRequestId}
                onSignRequest={() => setViewMode('sign')}
              />
            </div>
          )}

          {viewMode === 'sign' && selectedRequestId && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setViewMode('status')}
                  variant="outline"
                  icon={<SecurityIcons.ArrowLeft className="w-4 h-4" />}
                >
                  Back to Status
                </Button>
                <h2 className="text-xl font-semibold text-white">Sign Document</h2>
              </div>
              <MultiSignatureSign
                multiSignatureId={selectedRequestId}
                onSignComplete={handleSignComplete}
                onCancel={() => setViewMode('status')}
              />
            </div>
          )}

          {viewMode === 'list' && (
            <>
              {/* Create Tab */}
              {activeTab === 'create' && (
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-6">Create Multi-Signature Request</h2>
                  <MultiSignatureUpload
                    onUploadComplete={handleUploadComplete}
                  />
                </div>
              )}

              {/* Pending Actions Tab */}
              {activeTab === 'pending' && (
                <Card variant="glass" padding="lg">
                  <h2 className="text-xl font-semibold text-white mb-6">Pending Actions</h2>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="lg" />
                      <span className="ml-3 text-neutral-300">Loading requests...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {multiSignRequests.filter(req => req.userCanSign || (req.role === 'initiator' && req.status === 'pending')).length === 0 ? (
                        <div className="text-center py-12">
                          <SecurityIcons.Clock className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-neutral-300 mb-2">No Pending Actions</h3>
                          <p className="text-neutral-400">You have no documents waiting for your action</p>
                        </div>
                      ) : (
                        multiSignRequests
                          .filter(req => req.userCanSign || (req.role === 'initiator' && req.status === 'pending'))
                          .map((request) => (
                            <Card key={request.id} variant="outline" padding="md" className="border-neutral-600">
                              <div className="flex items-center justify-between">
                                <div className="flex items-start space-x-4">
                                  <div className="flex-shrink-0">
                                    {getStatusIcon(request.status)}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-white font-semibold mb-1">
                                      {(request.documents || request.document)?.file_name || 'Unknown Document'}
                                    </h3>
                                    {request.description && (
                                      <p className="text-neutral-300 text-sm mb-2">{request.description}</p>
                                    )}
                                    <div className="flex items-center space-x-4 text-sm">
                                      <span className="text-neutral-400">
                                        Role: <span className="text-neutral-300 capitalize">{request.role}</span>
                                      </span>
                                      <span className="text-neutral-400">
                                        Progress: <span className="text-neutral-300">{request.progress.completed}/{request.progress.total}</span>
                                      </span>
                                      <span className="text-neutral-400">
                                        Created: <span className="text-neutral-300">{formatDate(request.created_at)}</span>
                                      </span>
                                    </div>
                                    {request.userCanSign && request.currentSigner && (
                                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm">
                                        <span className="text-yellow-300 font-medium">Your turn to sign!</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => handleViewRequest(request.id, 'status')}
                                    size="sm"
                                    variant="outline"
                                    icon={<SecurityIcons.Eye className="w-4 h-4" />}
                                  >
                                    View Status
                                  </Button>
                                  <Button
                                    onClick={() => router.push(`/multi-signature/verify/${request.id}`)}
                                    size="sm"
                                    variant="ghost"
                                    icon={<SecurityIcons.Shield className="w-4 h-4" />}
                                  >
                                    Verify
                                  </Button>
                                  {/* Show Fix Status button for potentially stuck requests */}
                                  {request.status === 'pending' && request.progress?.percentage === 100 && (
                                    <Button
                                      onClick={() => handleFixStatus(request.id)}
                                      size="sm"
                                      variant="outline"
                                      className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                                      icon={<SecurityIcons.Alert className="w-4 h-4" />}
                                    >
                                      Fix Status
                                    </Button>
                                  )}
                                  {/* Show Generate PDF button for completed requests */}
                                  {request.status === 'completed' && (
                                    <Button
                                      onClick={() => handleGenerateFinalPDF(request.id)}
                                      size="sm"
                                      variant="outline"
                                      className="border-green-500 text-green-400 hover:bg-green-500/10"
                                      icon={<SecurityIcons.Document className="w-4 h-4" />}
                                    >
                                      Generate Final PDF
                                    </Button>
                                  )}
                                  {request.userCanSign && (
                                    <Button
                                      onClick={() => handleViewRequest(request.id, 'sign')}
                                      size="sm"
                                      variant="primary"
                                      icon={<SecurityIcons.Signature className="w-4 h-4" />}
                                    >
                                      Sign Now
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <Card variant="glass" padding="lg">
                  <h2 className="text-xl font-semibold text-white mb-6">All Multi-Signature Documents</h2>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="lg" />
                      <span className="ml-3 text-neutral-300">Loading documents...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {multiSignRequests.length === 0 ? (
                        <div className="text-center py-12">
                          <SecurityIcons.Document className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-neutral-300 mb-2">No Documents Found</h3>
                          <p className="text-neutral-400">Create your first multi-signature request to get started</p>
                        </div>
                      ) : (
                        multiSignRequests.map((request) => (
                          <Card key={request.id} variant="outline" padding="md" className="border-neutral-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                  {getStatusIcon(request.status)}
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-white font-semibold mb-1">
                                    {(request.documents || request.document)?.file_name || 'Unknown Document'}
                                  </h3>
                                  {request.description && (
                                    <p className="text-neutral-300 text-sm mb-2">{request.description}</p>
                                  )}
                                  <div className="flex items-center space-x-4 text-sm">
                                    <span className="text-neutral-400">
                                      Status: <span className={`font-medium ${getStatusColor(request.status)}`}>{request.status.toUpperCase()}</span>
                                    </span>
                                    <span className="text-neutral-400">
                                      Role: <span className="text-neutral-300 capitalize">{request.role}</span>
                                    </span>
                                    <span className="text-neutral-400">
                                      Progress: <span className="text-neutral-300">{request.progress.percentage}%</span>
                                    </span>
                                    <span className="text-neutral-400">
                                      Created: <span className="text-neutral-300">{formatDate(request.created_at)}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleViewRequest(request.id, 'status')}
                                  size="sm"
                                  variant="outline"
                                  icon={<SecurityIcons.Eye className="w-4 h-4" />}
                                >
                                  View Details
                                </Button>
                                <Button
                                  onClick={() => router.push(`/multi-signature/verify/${request.id}`)}
                                  size="sm"
                                  variant="ghost"
                                  icon={<SecurityIcons.Shield className="w-4 h-4" />}
                                >
                                  Verify
                                </Button>
                                {/* Show Fix Status button for potentially stuck requests */}
                                {request.status === 'pending' && request.progress?.percentage === 100 && (
                                  <Button
                                    onClick={() => handleFixStatus(request.id)}
                                    size="sm"
                                    variant="outline"
                                    className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                                    icon={<SecurityIcons.Alert className="w-4 h-4" />}
                                  >
                                    Fix Status
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

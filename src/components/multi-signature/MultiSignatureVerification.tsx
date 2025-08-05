'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';

interface SignerDetails {
  id: string;
  signerCustomId: string;
  signingOrder: number;
  status: 'pending' | 'signed' | 'rejected';
  signedAt?: string;
  hasSignature?: boolean;
  signatureMetadata?: any;
}

interface MultiSignatureVerificationData {
  multiSignatureRequest: {
    id: string;
    status: string;
    description?: string;
    initiatorCustomId: string;
    createdAt: string;
    completedAt?: string;
    signingType: string;
  };
  document: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    originalHash: string;
    publicUrl: string;
    signedPublicUrl?: string;
    status: string;
    uploadDate: string;
    metadata?: any;
  };
  signers: SignerDetails[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface MultiSignatureVerificationProps {
  multiSignatureId: string;
  onClose?: () => void;
}

export const MultiSignatureVerification: React.FC<MultiSignatureVerificationProps> = ({
  multiSignatureId,
  onClose
}) => {
  const [data, setData] = useState<MultiSignatureVerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerificationData = async () => {
    try {
      const response = await fetch(`/api/verify/multi-signature/${multiSignatureId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verification data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch verification data');
      }
    } catch (err) {
      console.error('Error fetching verification data:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationData();
  }, [multiSignatureId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <SecurityIcons.Verified className="w-5 h-5 text-green-400" />;
      case 'pending':
        return <SecurityIcons.Clock className="w-5 h-5 text-yellow-400" />;
      case 'rejected':
        return <SecurityIcons.X className="w-5 h-5 text-red-400" />;
      default:
        return <SecurityIcons.Clock className="w-5 h-5 text-neutral-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'rejected':
        return 'text-red-400';
      default:
        return 'text-neutral-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <Card variant="glass" padding="lg">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-neutral-300">Loading verification data...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <Card variant="outline" padding="lg" className="border-red-500/30 bg-red-500/10 max-w-md">
          <div className="text-center">
            <SecurityIcons.Alert className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-red-300 font-semibold mb-2">Verification Error</h3>
            <p className="text-red-200 text-sm mb-4">{error}</p>
            <div className="flex space-x-3">
              <Button onClick={fetchVerificationData} variant="outline" size="sm">
                Retry
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="ghost" size="sm">
                  Close
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <Card variant="glass" padding="lg">
          <div className="text-center py-12">
            <SecurityIcons.Document className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-neutral-300 font-semibold">No Data Available</h3>
          </div>
        </Card>
      </div>
    );
  }

  // Debug logging
  console.log('🔍 Rendering with data:', data);
  console.log('📄 Document:', data.document);
  console.log('👥 Signers:', data.signers);

  try {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Document Verification</h1>
                <p className="text-neutral-400">Multi-Signature Document Details</p>
              </div>
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  icon={<SecurityIcons.X className="w-4 h-4" />}
                >
                  Close
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Document Information */}
            <Card variant="glass" padding="lg">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <SecurityIcons.Document className="w-6 h-6 mr-3 text-primary-400" />
                Document Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-neutral-400 text-sm">File Name</label>
                    <p className="text-white font-medium">{data.document.fileName}</p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">File Size</label>
                    <p className="text-white">{formatFileSize(data.document.fileSize)}</p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">File Type</label>
                    <p className="text-white">{data.document.fileType}</p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">Document Hash</label>
                    <p className="text-white font-mono text-sm break-all">{data.document.originalHash}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-neutral-400 text-sm">Status</label>
                    <p className={`font-semibold ${getStatusColor(data.multiSignatureRequest.status)}`}>
                      {data.multiSignatureRequest.status.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">Initiated By</label>
                    <p className="text-white">{data.multiSignatureRequest.initiatorCustomId}</p>
                  </div>
                  <div>
                    <label className="text-neutral-400 text-sm">Created</label>
                    <p className="text-white">{formatDate(data.multiSignatureRequest.createdAt)}</p>
                  </div>
                  {data.multiSignatureRequest.completedAt && (
                    <div>
                      <label className="text-neutral-400 text-sm">Completed</label>
                      <p className="text-white">{formatDate(data.multiSignatureRequest.completedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {data.multiSignatureRequest.description && (
                <div className="mt-6 p-4 bg-neutral-800/30 rounded-lg">
                  <label className="text-neutral-400 text-sm">Description</label>
                  <p className="text-white mt-1">{data.multiSignatureRequest.description}</p>
                </div>
              )}

              <div className="mt-6">
                <Button
                  onClick={() => {
                    // Use signed PDF for completed documents, original PDF for pending ones
                    const documentUrl = (data.document.status === 'completed' && data.document.signedPublicUrl)
                      ? data.document.signedPublicUrl
                      : data.document.publicUrl;
                    window.open(documentUrl, '_blank');
                  }}
                  variant="primary"
                  icon={<SecurityIcons.ExternalLink className="w-4 h-4" />}
                >
                  View Document
                </Button>
              </div>
            </Card>

            {/* Signing Progress */}
            <Card variant="glass" padding="lg">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <SecurityIcons.Timeline className="w-6 h-6 mr-3 text-primary-400" />
                Signing Progress
              </h2>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-300 font-medium">Overall Progress</span>
                  <span className="text-neutral-300">{data.progress.percentage}%</span>
                </div>
                <div className="w-full bg-neutral-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${data.progress.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-neutral-400 mt-2">
                  <span>{data.progress.completed} of {data.progress.total} signatures completed</span>
                  <span>{data.multiSignatureRequest.signingType} signing</span>
                </div>
              </div>

              {/* Signers Timeline */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Signers Timeline</h3>
                {data.signers.map((signer, index) => (
                  <div key={signer.id} className="flex items-center space-x-4">
                    {/* Order Number */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${signer.status === 'signed'
                      ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
                      : signer.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500'
                        : 'bg-neutral-700 text-neutral-400 border-2 border-neutral-600'
                      }`}>
                      {signer.signingOrder + 1}
                    </div>

                    {/* Connector Line */}
                    {index < data.signers.length - 1 && (
                      <div className={`absolute left-[2.75rem] mt-8 w-0.5 h-6 ${signer.status === 'signed' ? 'bg-green-500' : 'bg-neutral-600'
                        }`} />
                    )}

                    {/* Signer Details */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-white font-medium">{signer.signerCustomId}</span>
                          {getStatusIcon(signer.status)}
                          <span className={`text-sm font-medium ${getStatusColor(signer.status)}`}>
                            {signer.status.charAt(0).toUpperCase() + signer.status.slice(1)}
                          </span>
                        </div>
                        {signer.signedAt && (
                          <span className="text-neutral-400 text-sm">
                            {formatDate(signer.signedAt)}
                          </span>
                        )}
                      </div>

                      {signer.hasSignature && (
                        <div className="mt-2 p-3 bg-neutral-800/30 rounded-lg">
                          <label className="text-neutral-400 text-xs">Digital Signature</label>
                          <p className="text-green-400 text-xs mt-1">
                            ✓ Signature verified and stored securely
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Verification Summary */}
            <Card variant="glass" padding="lg">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <SecurityIcons.Shield className="w-6 h-6 mr-3 text-primary-400" />
                Verification Summary
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-neutral-800/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary-400 mb-2">{data.progress.total}</div>
                  <div className="text-neutral-300">Total Signers</div>
                </div>
                <div className="text-center p-4 bg-neutral-800/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-400 mb-2">{data.progress.completed}</div>
                  <div className="text-neutral-300">Completed</div>
                </div>
                <div className="text-center p-4 bg-neutral-800/30 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400 mb-2">{data.progress.total - data.progress.completed}</div>
                  <div className="text-neutral-300">Pending</div>
                </div>
              </div>

              {data.multiSignatureRequest.status === 'completed' && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <SecurityIcons.Verified className="w-6 h-6 text-green-400" />
                    <div>
                      <h3 className="text-green-300 font-semibold">Document Fully Executed</h3>
                      <p className="text-green-200 text-sm">
                        All required signatures have been collected and verified. This document is legally binding.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (renderError) {
    console.error('❌ Rendering error:', renderError);
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <Card variant="outline" padding="lg" className="border-red-500/30 bg-red-500/10 max-w-md">
          <div className="text-center">
            <SecurityIcons.Alert className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-red-300 font-semibold mb-2">Rendering Error</h3>
            <p className="text-red-200 text-sm mb-4">
              {renderError instanceof Error ? renderError.message : 'Unknown rendering error'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Reload Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }
};

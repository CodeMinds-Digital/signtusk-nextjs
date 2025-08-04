'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';
import { useMultiSignaturePolling } from '@/hooks/useSmartPolling';

interface Signer {
  id: string;
  signer_custom_id: string;
  signing_order: number;
  status: 'pending' | 'signed' | 'rejected';
  signed_at?: string;
}

interface MultiSignatureData {
  id: string;
  status: 'pending' | 'completed' | 'rejected';
  description?: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    current: number;
  };
  currentSigner?: {
    customId: string;
    order: number;
  };
  nextSigners: Array<{
    customId: string;
    order: number;
  }>;
  timeline: Array<{
    order: number;
    signerCustomId: string;
    status: string;
    signedAt?: string;
    isCurrent: boolean;
  }>;
  userPermissions: {
    canSign: boolean;
    isInitiator: boolean;
    isSigner: boolean;
    userOrder?: number;
  };
  timestamps: {
    createdAt: string;
    completedAt?: string;
  };
  document?: {
    file_name: string;
    file_size: number;
    public_url: string;
  };
}

interface MultiSignatureStatusProps {
  multiSignatureId: string;
  onSignRequest?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const MultiSignatureStatus: React.FC<MultiSignatureStatusProps> = ({
  multiSignatureId,
  onSignRequest,
  autoRefresh = true,
  refreshInterval = 60000 // 60 seconds (reduced from 10 seconds)
}) => {
  const [data, setData] = useState<MultiSignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/multi-signature/status/${multiSignatureId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const result = await response.json();
      if (result.success) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      } else {
        setError(result.error || 'Failed to fetch status');
      }
    } catch (err) {
      console.error('Error fetching status:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [multiSignatureId]);

  // Smart polling that stops when completed
  const { restart: restartPolling, stop: stopPolling, isPolling } = useMultiSignaturePolling(
    fetchStatus,
    data?.status,
    {
      enabled: autoRefresh,
      interval: refreshInterval
    }
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
      <Card variant="glass" padding="lg">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-neutral-300">Loading status...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outline" padding="lg" className="border-red-500/30 bg-red-500/10">
        <div className="flex items-center space-x-3">
          <SecurityIcons.Alert className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-300 font-semibold">Error Loading Status</h3>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
        <Button
          onClick={fetchStatus}
          variant="outline"
          size="sm"
          className="mt-4"
          icon={<SecurityIcons.Refresh className="w-4 h-4" />}
        >
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="glass" padding="lg">
        <div className="text-center py-12">
          <SecurityIcons.Document className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-neutral-300 font-semibold">No Data Available</h3>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card variant="glass" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Multi-Signature Status</h2>
            {data.description && (
              <p className="text-neutral-300">{data.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getStatusColor(data.status)}`}>
              {data.status.toUpperCase()}
            </div>
            <div className="text-neutral-400 text-sm">
              {data.progress.completed} of {data.progress.total} signed
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-neutral-300 font-medium">Progress</span>
            <span className="text-neutral-300">{data.progress.percentage}%</span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${data.progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Current Status */}
        {data.status === 'pending' && data.currentSigner && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <SecurityIcons.Clock className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-300 font-medium">
                  Waiting for signature from: {data.currentSigner.customId}
                </p>
                <p className="text-yellow-200 text-sm">
                  Position {data.currentSigner.order + 1} in signing order
                </p>
              </div>
            </div>
          </div>
        )}

        {data.status === 'completed' && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <SecurityIcons.Verified className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-green-300 font-medium">All signatures completed!</p>
                <p className="text-green-200 text-sm">
                  Completed on {data.timestamps.completedAt && formatDate(data.timestamps.completedAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Signing Timeline */}
      <Card variant="glass" padding="lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <SecurityIcons.Timeline className="w-6 h-6 mr-3 text-primary-400" />
          Signing Timeline
        </h3>

        <div className="space-y-4">
          {data.timeline.map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              {/* Order Number */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${item.status === 'signed'
                ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
                : item.isCurrent
                  ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500 animate-pulse'
                  : 'bg-neutral-700 text-neutral-400 border-2 border-neutral-600'
                }`}>
                {item.order + 1}
              </div>

              {/* Connector Line */}
              {index < data.timeline.length - 1 && (
                <div className={`absolute left-[2.75rem] mt-8 w-0.5 h-6 ${item.status === 'signed' ? 'bg-green-500' : 'bg-neutral-600'
                  }`} />
              )}

              {/* Signer Info */}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium">{item.signerCustomId}</span>
                    {getStatusIcon(item.status)}
                    <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                  {item.signedAt && (
                    <p className="text-neutral-400 text-sm mt-1">
                      Signed on {formatDate(item.signedAt)}
                    </p>
                  )}
                  {item.isCurrent && (
                    <p className="text-yellow-300 text-sm mt-1">
                      Currently pending signature
                    </p>
                  )}
                </div>

                {/* Sign Button for Current User */}
                {item.isCurrent && data.userPermissions.canSign && (
                  <Button
                    onClick={onSignRequest}
                    variant="primary"
                    size="sm"
                    icon={<SecurityIcons.Signature className="w-4 h-4" />}
                  >
                    Sign Now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Next Signers */}
      {data.nextSigners.length > 0 && (
        <Card variant="glass" padding="lg">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <SecurityIcons.Users className="w-6 h-6 mr-3 text-primary-400" />
            Next in Queue
          </h3>

          <div className="space-y-3">
            {data.nextSigners.map((signer, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-neutral-800/30 rounded-lg">
                <div className="w-6 h-6 bg-neutral-600 rounded-full flex items-center justify-center text-xs font-semibold text-neutral-300">
                  {signer.order + 1}
                </div>
                <span className="text-neutral-300">{signer.customId}</span>
                <span className="text-neutral-400 text-sm">
                  Position {signer.order + 1}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Document Info */}
      {data.document && (
        <Card variant="glass" padding="lg">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <SecurityIcons.Document className="w-6 h-6 mr-3 text-primary-400" />
            Document Information
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">File Name:</span>
              <span className="text-white font-medium">{data.document.file_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">File Size:</span>
              <span className="text-white">{(data.document.file_size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">Created:</span>
              <span className="text-white">{formatDate(data.timestamps.createdAt)}</span>
            </div>
            {data.document.public_url && (
              <Button
                onClick={() => window.open(data.document!.public_url, '_blank')}
                variant="outline"
                size="sm"
                fullWidth
                icon={<SecurityIcons.ExternalLink className="w-4 h-4" />}
              >
                View Document
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Last Updated */}
      <div className="text-center">
        <p className="text-neutral-400 text-sm">
          Last updated: {lastUpdated?.toLocaleTimeString()}
          {autoRefresh && data?.status !== 'completed' && (
            <span className="ml-2">
              {isPolling ? (
                <SecurityIcons.Refresh className="w-3 h-3 inline animate-spin" />
              ) : (
                <span className="text-green-400">✓ Auto-refresh stopped</span>
              )}
            </span>
          )}
        </p>
        {data?.status === 'completed' && (
          <p className="text-green-400 text-xs mt-1">
            🛑 Polling stopped - request completed
          </p>
        )}
      </div>
    </div>
  );
};

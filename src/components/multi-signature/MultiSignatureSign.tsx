'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';

interface SigningData {
  multiSignatureRequest: {
    id: string;
    status: string;
    description?: string;
    initiator_custom_id: string;
    created_at: string;
  };
  document: {
    id: string;
    file_name: string;
    file_size: number;
    original_hash: string;
    public_url: string;
  };
  currentSigner?: {
    customId: string;
    order: number;
  };
  userPermissions: {
    canSign: boolean;
    role: string;
    userOrder?: number;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface SignResult {
  success: boolean;
  message: string;
  signature?: string;
  isCompleted?: boolean;
  nextSigner?: {
    customId: string;
    order: number;
  };
}

interface MultiSignatureSignProps {
  multiSignatureId: string;
  onSignComplete?: (result: SignResult) => void;
  onCancel?: () => void;
}

export const MultiSignatureSign: React.FC<MultiSignatureSignProps> = ({
  multiSignatureId,
  onSignComplete,
  onCancel
}) => {
  const { wallet } = useWallet();
  const [data, setData] = useState<SigningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signResult, setSignResult] = useState<SignResult | null>(null);
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);
  const [privateKey, setPrivateKey] = useState('');

  const fetchSigningData = async () => {
    try {
      const response = await fetch(`/api/multi-signature/${multiSignatureId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch signing data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch signing data');
      }
    } catch (err) {
      console.error('Error fetching signing data:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSigningData();
  }, [multiSignatureId]);

  const handleSign = async () => {
    if (!wallet || !data || !privateKey.trim()) {
      alert('Please enter your private key to sign');
      return;
    }

    setSigning(true);
    setSignResult(null);

    try {
      const response = await fetch(`/api/multi-signature/${multiSignatureId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          private_key: privateKey.trim()
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setSignResult(result);
        setPrivateKey(''); // Clear private key for security
        setShowPrivateKeyInput(false);
        onSignComplete?.(result);
        
        // Refresh data to show updated status
        setTimeout(fetchSigningData, 1000);
      } else {
        setSignResult({
          success: false,
          message: result.error || 'Failed to sign document'
        });
      }
    } catch (error) {
      console.error('Signing error:', error);
      setSignResult({
        success: false,
        message: 'Network error occurred during signing'
      });
    } finally {
      setSigning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card variant="glass" padding="lg">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-neutral-300">Loading signing interface...</span>
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
            <h3 className="text-red-300 font-semibold">Error Loading Document</h3>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
        <div className="flex space-x-3 mt-4">
          <Button
            onClick={fetchSigningData}
            variant="outline"
            size="sm"
            icon={<SecurityIcons.Refresh className="w-4 h-4" />}
          >
            Retry
          </Button>
          {onCancel && (
            <Button onClick={onCancel} variant="ghost" size="sm">
              Cancel
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card variant="glass" padding="lg">
        <div className="text-center py-12">
          <SecurityIcons.Document className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-neutral-300 font-semibold">No Document Found</h3>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card variant="glass" padding="lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Document Signing</h2>
            <p className="text-neutral-300">{data.document.file_name}</p>
            {data.multiSignatureRequest.description && (
              <p className="text-neutral-400 mt-2">{data.multiSignatureRequest.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-primary-400 font-semibold">
              Multi-Signature Document
            </div>
            <div className="text-neutral-400 text-sm">
              {data.progress.completed} of {data.progress.total} signed
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-neutral-300 font-medium">Signing Progress</span>
            <span className="text-neutral-300">{data.progress.percentage}%</span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${data.progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Document Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-800/30 rounded-lg">
          <div>
            <span className="text-neutral-400 text-sm">File Size:</span>
            <p className="text-white font-medium">{(data.document.file_size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div>
            <span className="text-neutral-400 text-sm">Initiated By:</span>
            <p className="text-white font-medium">{data.multiSignatureRequest.initiator_custom_id}</p>
          </div>
          <div>
            <span className="text-neutral-400 text-sm">Created:</span>
            <p className="text-white font-medium">{formatDate(data.multiSignatureRequest.created_at)}</p>
          </div>
          <div>
            <span className="text-neutral-400 text-sm">Your Position:</span>
            <p className="text-white font-medium">
              {data.userPermissions.userOrder !== undefined ? `${data.userPermissions.userOrder + 1} of ${data.progress.total}` : 'N/A'}
            </p>
          </div>
        </div>
      </Card>

      {/* Document Preview */}
      <Card variant="glass" padding="lg">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <SecurityIcons.Document className="w-6 h-6 mr-3 text-primary-400" />
          Document Preview
        </h3>
        
        <div className="p-6 bg-neutral-800/30 rounded-lg border border-neutral-700 text-center">
          <SecurityIcons.FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">{data.document.file_name}</p>
          <p className="text-neutral-400 text-sm mb-4">
            Click below to view the full document before signing
          </p>
          <Button
            onClick={() => window.open(data.document.public_url, '_blank')}
            variant="outline"
            icon={<SecurityIcons.ExternalLink className="w-4 h-4" />}
          >
            View Full Document
          </Button>
        </div>
      </Card>

      {/* Signing Status */}
      {data.userPermissions.canSign ? (
        <Card variant="glass" padding="lg">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <SecurityIcons.Signature className="w-6 h-6 mr-3 text-primary-400" />
            Your Signature
          </h3>

          {!showPrivateKeyInput ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <SecurityIcons.Clock className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-300 font-medium">Ready to Sign</p>
                    <p className="text-green-200 text-sm">
                      It's your turn to sign this document. Review the document above and click below to proceed.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowPrivateKeyInput(true)}
                variant="primary"
                size="lg"
                fullWidth
                icon={<SecurityIcons.Key className="w-5 h-5" />}
              >
                Proceed to Sign Document
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <SecurityIcons.Shield className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-yellow-300 font-medium">Secure Signing</p>
                    <p className="text-yellow-200 text-sm">
                      Enter your private key to create a digital signature. Your private key is never stored or transmitted.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-2">
                  Private Key
                </label>
                <input
                  type="password"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Enter your private key..."
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-3 text-white placeholder-neutral-400 focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleSign}
                  disabled={signing || !privateKey.trim()}
                  loading={signing}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<SecurityIcons.Signature className="w-5 h-5" />}
                >
                  {signing ? 'Signing Document...' : 'Sign Document'}
                </Button>
                <Button
                  onClick={() => {
                    setShowPrivateKeyInput(false);
                    setPrivateKey('');
                  }}
                  disabled={signing}
                  variant="outline"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card variant="outline" padding="lg" className="border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-center space-x-3">
            <SecurityIcons.Clock className="w-6 h-6 text-yellow-400" />
            <div>
              <h3 className="text-yellow-300 font-semibold">Waiting for Your Turn</h3>
              <p className="text-yellow-200 text-sm">
                {data.currentSigner 
                  ? `Currently waiting for ${data.currentSigner.customId} to sign (position ${data.currentSigner.order + 1})`
                  : 'Please wait for your turn to sign this document'
                }
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Sign Result */}
      {signResult && (
        <Card 
          variant="outline" 
          padding="md" 
          className={`${signResult.success 
            ? 'border-green-500/30 bg-green-500/10' 
            : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          <div className="flex items-start space-x-3">
            {signResult.success ? (
              <SecurityIcons.Verified className="w-5 h-5 text-green-400 mt-0.5" />
            ) : (
              <SecurityIcons.Alert className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${signResult.success ? 'text-green-300' : 'text-red-300'}`}>
                {signResult.success ? 'Signature Successful!' : 'Signing Failed'}
              </p>
              <p className={`text-sm ${signResult.success ? 'text-green-200' : 'text-red-200'}`}>
                {signResult.message}
              </p>
              {signResult.success && signResult.nextSigner && (
                <p className="text-green-200 text-sm mt-2">
                  Next signer: {signResult.nextSigner.customId} (position {signResult.nextSigner.order + 1})
                </p>
              )}
              {signResult.success && signResult.isCompleted && (
                <p className="text-green-200 text-sm mt-2 font-medium">
                  🎉 All signatures completed! The document is now fully executed.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            size="lg"
            icon={<SecurityIcons.ArrowLeft className="w-4 h-4" />}
          >
            Back to List
          </Button>
        )}
        <Button
          onClick={fetchSigningData}
          variant="ghost"
          size="lg"
          icon={<SecurityIcons.Refresh className="w-4 h-4" />}
        >
          Refresh Status
        </Button>
      </div>
    </div>
  );
};

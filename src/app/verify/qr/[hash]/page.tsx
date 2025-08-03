'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/DesignSystem';
import { Card } from '@/components/ui/Card';

interface VerificationData {
  document: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    originalHash: string;
    signedHash?: string;
    status: string;
    uploadDate: string;
    lastUpdated: string;
    metadata?: any;
  };
  signatures: Array<{
    id: string;
    signerId: string;
    signerCustomId?: string;
    signerAddress: string;
    signatureType: string;
    signedAt: string;
    signatureMetadata?: any;
    hasSignature: boolean;
  }>;
  verification: {
    isValid: boolean;
    signatureCount: number;
    verifiedAt: string;
    documentType: string;
  };
  qrVerification: {
    scannedAt: string;
    verificationMethod: string;
    documentHash: string;
  };
}

export default function QRVerificationPage() {
  const params = useParams();
  const hash = params.hash as string;

  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerificationData = async () => {
      if (!hash) {
        setError('Invalid verification hash');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/verify/qr/${hash}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to verify document');
        }

        setVerificationData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
      } finally {
        setLoading(false);
      }
    };

    fetchVerificationData();
  }, [hash]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-bold mb-2 text-white mt-4">Verifying Document...</h2>
          <p className="text-neutral-400">Retrieving verification details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <Card variant="glass" padding="lg" className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
          <p className="text-neutral-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </Card>
      </div>
    );
  }

  if (!verificationData) {
    return null;
  }

  const { document, signatures, verification, qrVerification } = verificationData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${verification.isValid
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
            }`}>
            {verification.isValid ? (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Document {verification.isValid ? 'Verified' : 'Invalid'}
          </h1>
          <p className="text-neutral-400">
            QR Code verification completed at {formatDate(qrVerification.scannedAt)}
          </p>
        </div>

        {/* Document Information */}
        <Card variant="glass" padding="lg" className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Document Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400">File Name</label>
              <p className="text-white font-medium">{document.fileName}</p>
            </div>
            <div>
              <label className="text-sm text-neutral-400">File Size</label>
              <p className="text-white font-medium">{formatFileSize(document.fileSize)}</p>
            </div>
            <div>
              <label className="text-sm text-neutral-400">File Type</label>
              <p className="text-white font-medium">{document.fileType}</p>
            </div>
            <div>
              <label className="text-sm text-neutral-400">Status</label>
              <p className={`font-medium capitalize ${document.status === 'completed' || document.status === 'signed'
                  ? 'text-green-400'
                  : 'text-yellow-400'
                }`}>
                {document.status}
              </p>
            </div>
            <div>
              <label className="text-sm text-neutral-400">Upload Date</label>
              <p className="text-white font-medium">{formatDate(document.uploadDate)}</p>
            </div>
            <div>
              <label className="text-sm text-neutral-400">Last Updated</label>
              <p className="text-white font-medium">{formatDate(document.lastUpdated)}</p>
            </div>
          </div>
        </Card>

        {/* Signature Information */}
        <Card variant="glass" padding="lg" className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Signatures ({verification.signatureCount})
          </h2>
          {signatures.length > 0 ? (
            <div className="space-y-4">
              {signatures.map((signature, index) => (
                <div key={signature.id} className="border border-neutral-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-neutral-400">Signer ID</label>
                      <p className="text-white font-medium">{signature.signerCustomId || signature.signerId}</p>
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400">Wallet Address</label>
                      <p className="text-white font-medium font-mono text-sm">{signature.signerAddress}</p>
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400">Signature Type</label>
                      <p className="text-white font-medium capitalize">{signature.signatureType}</p>
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400">Signed At</label>
                      <p className="text-white font-medium">{formatDate(signature.signedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400">No signatures found</p>
          )}
        </Card>

        {/* Hash Information */}
        <Card variant="glass" padding="lg" className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Hash Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-neutral-400">Original Document Hash</label>
              <p className="text-white font-mono text-sm break-all">{document.originalHash}</p>
            </div>
            {document.signedHash && (
              <div>
                <label className="text-sm text-neutral-400">Signed Document Hash</label>
                <p className="text-white font-mono text-sm break-all">{document.signedHash}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-neutral-400">Verification Hash</label>
              <p className="text-white font-mono text-sm break-all">{qrVerification.documentHash}</p>
            </div>
          </div>
        </Card>

        {/* QR Verification Details */}
        <Card variant="glass" padding="lg">
          <h2 className="text-xl font-bold text-white mb-4">QR Verification Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400">Verification Method</label>
              <p className="text-white font-medium">{qrVerification.verificationMethod}</p>
            </div>
            <div>
              <label className="text-sm text-neutral-400">Verified At</label>
              <p className="text-white font-medium">{formatDate(verification.verifiedAt)}</p>
            </div>
            <div>
              <label className="text-sm text-neutral-400">Document Type</label>
              <p className="text-white font-medium capitalize">{verification.documentType}</p>
            </div>
            <div>
              <label className="text-sm text-neutral-400">Overall Status</label>
              <p className={`font-medium ${verification.isValid ? 'text-green-400' : 'text-red-400'
                }`}>
                {verification.isValid ? 'Valid & Verified' : 'Invalid or Unverified'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

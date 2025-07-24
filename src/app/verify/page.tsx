'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';

type Signature = {
  signerId?: string;
  signerName?: string;
  timestamp?: string;
  isValid: boolean;
  signature: string;
};

type Metadata = {
  title?: string;
  purpose?: string;
  signerInfo?: string;
};

type VerificationDetails = {
  fileName?: string;
  fileSize?: number;
  documentHash?: string;
  signatures?: Signature[];
  metadata?: Metadata;
  verification_method?: string;
  isSignedPDF?: boolean;
  total_signatures?: number;
  valid_signatures?: number;
  originalHash?: string;
  signedHash?: string;
};

type VerificationResult = {
  isValid: boolean;
  details?: VerificationDetails;
  error?: string;
};

export default function VerifyPage() {
  const { isLoading } = useWallet(); // Removed unused 'wallet'
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const verifyFileInputRef = useRef<HTMLInputElement>(null);

  const handleVerifyDocument = async (file: File, providedSignature?: string) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (providedSignature) {
        formData.append('signature', providedSignature);
      }

      const response = await fetch('/api/documents/verify', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to verify document');
      }

      const result = await response.json();
      const verification: VerificationResult = result.verification;

      setVerificationResult({
        isValid: verification.isValid,
        details: verification.details,
        error: verification.error
      });

    } catch (error) {
      console.error('Error verifying document:', error);
      setVerificationResult({
        isValid: false,
        error: 'Failed to verify document'
      });
    } finally {
      setIsProcessing(false);
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
    return new Date(isoString).toLocaleString();
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <span className="text-white text-2xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Loading Verification...</h2>
          <p className="text-gray-300">Initializing verification system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Document Verification</h1>
              <p className="text-gray-300">Verify the authenticity and integrity of signed documents</p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Verification Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Upload Document to Verify</h3>
              <p className="text-gray-300 mb-6">
                Upload any document to verify its digital signature. The system supports both original and signed documents across all signature models.
              </p>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <label className="block text-white font-semibold mb-4">Select Document to Verify</label>
              <input
                ref={verifyFileInputRef}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleVerifyDocument(file);
                  }
                }}
                className="block w-full text-gray-300 bg-white/10 border border-white/20 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="mt-4 flex items-center space-x-3 text-purple-300">
                  <div className="w-5 h-5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying document...</span>
                </div>
              )}
            </div>

            {/* Verification Results */}
            {verificationResult && (
              <div className="space-y-6">
                {/* Main Verification Status */}
                <div className={`p-6 rounded-lg border ${verificationResult.isValid
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                  }`}>
                  <div className="flex items-center mb-4">
                    <span className="text-3xl mr-4">
                      {verificationResult.isValid ? '✅' : '❌'}
                    </span>
                    <div>
                      <h4 className={`text-2xl font-bold ${verificationResult.isValid ? 'text-green-300' : 'text-red-300'
                        }`}>
                        {verificationResult.isValid ? 'Signature Valid' : 'Signature Invalid'}
                      </h4>
                      <p className={`text-sm ${verificationResult.isValid ? 'text-green-200' : 'text-red-200'
                        }`}>
                        {verificationResult.isValid
                          ? 'Document signature has been successfully verified'
                          : 'Document signature verification failed'
                        }
                      </p>
                    </div>
                  </div>

                  {verificationResult.details && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Document:</span>
                        <p className="text-white font-semibold">{verificationResult.details.fileName}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">File Size:</span>
                        <p className="text-white">{verificationResult.details.fileSize ? formatFileSize(verificationResult.details.fileSize) : 'Unknown'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-gray-400">Document Hash:</span>
                        <p className="font-mono text-xs text-white break-all bg-black/20 p-2 rounded mt-1">
                          {verificationResult.details.documentHash}
                        </p>
                      </div>
                    </div>
                  )}

                  {verificationResult.error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                      <p className="text-red-300 font-semibold">Error:</p>
                      <p className="text-red-200">{verificationResult.error}</p>
                    </div>
                  )}
                </div>

                {/* Detailed Information */}
                {verificationResult.isValid && verificationResult.details && (
                  <>
                    {/* Signature Details */}
                    <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                      <h4 className="text-lg font-bold text-white mb-4">📋 Signature Details</h4>

                      <div className="space-y-4">
                        {/* Signature Information */}
                        {verificationResult.details.signatures && verificationResult.details.signatures.length > 0 && (
                          <div>
                            <h5 className="text-white font-semibold mb-3">Digital Signatures ({verificationResult.details.signatures.length})</h5>
                            {verificationResult.details.signatures.map((sig: any, index: number) => (
                              <div key={index} className="bg-black/20 rounded-lg p-4 mb-3">
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
                                    <span className="text-gray-400">Signed At:</span>
                                    <p className="text-white">{sig.timestamp ? formatDate(sig.timestamp) : 'Unknown'}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Status:</span>
                                    <p className={`font-semibold ${sig.isValid ? 'text-green-300' : 'text-red-300'}`}>
                                      {sig.isValid ? '✅ Valid' : '❌ Invalid'}
                                    </p>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-gray-400">Signature:</span>
                                    <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded mt-1">
                                      {sig.signature}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Document Metadata */}
                        {verificationResult.details.metadata && (
                          <div>
                            <h5 className="text-white font-semibold mb-3">📄 Document Metadata</h5>
                            <div className="bg-black/20 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {verificationResult.details.metadata.title && (
                                  <div>
                                    <span className="text-gray-400">Title:</span>
                                    <p className="text-white">{verificationResult.details.metadata.title}</p>
                                  </div>
                                )}
                                {verificationResult.details.metadata.purpose && (
                                  <div>
                                    <span className="text-gray-400">Purpose:</span>
                                    <p className="text-white">{verificationResult.details.metadata.purpose}</p>
                                  </div>
                                )}
                                {verificationResult.details.metadata.signerInfo && (
                                  <div className="md:col-span-2">
                                    <span className="text-gray-400">Signer Information:</span>
                                    <p className="text-white">{verificationResult.details.metadata.signerInfo}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Technical Details */}
                        <div>
                          <h5 className="text-white font-semibold mb-3">🔧 Technical Details</h5>
                          <div className="bg-black/20 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-400">Verification Method:</span>
                                <p className="text-white">{verificationResult.details.verification_method || 'Standard'}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Is Signed PDF:</span>
                                <p className="text-white">{verificationResult.details.isSignedPDF ? 'Yes' : 'No'}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Total Signatures:</span>
                                <p className="text-white">{verificationResult.details.total_signatures || 0}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Valid Signatures:</span>
                                <p className="text-green-300">{verificationResult.details.valid_signatures || 0}</p>
                              </div>
                              {verificationResult.details.originalHash && (
                                <div className="md:col-span-2">
                                  <span className="text-gray-400">Original Hash:</span>
                                  <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded mt-1">
                                    {verificationResult.details.originalHash}
                                  </p>
                                </div>
                              )}
                              {verificationResult.details.signedHash && verificationResult.details.signedHash !== verificationResult.details.originalHash && (
                                <div className="md:col-span-2">
                                  <span className="text-gray-400">Signed Hash:</span>
                                  <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded mt-1">
                                    {verificationResult.details.signedHash}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Preview */}
                    {verificationResult.details.fileName && verificationResult.details.fileName.toLowerCase().endsWith('.pdf') && (
                      <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                        <h4 className="text-lg font-bold text-white mb-4">📄 Document Preview</h4>
                        <div className="bg-white rounded-lg p-4">
                          <iframe
                            src={URL.createObjectURL(verifyFileInputRef.current?.files?.[0] || new Blob())}
                            className="w-full h-96 border-0 rounded"
                            title="Verified Document Preview"
                          />
                        </div>
                        <div className="mt-4 flex space-x-3">
                          <button
                            onClick={() => {
                              const file = verifyFileInputRef.current?.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = file.name;
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 text-sm font-semibold"
                          >
                            📥 Download Document
                          </button>
                          <button
                            onClick={() => {
                              if (verificationResult.details?.documentHash) {
                                navigator.clipboard.writeText(verificationResult.details.documentHash);
                                alert('Document hash copied to clipboard!');
                              }
                            }}
                            className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 text-sm"
                          >
                            📋 Copy Hash
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Verification Summary */}
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h3 className="text-xl font-bold text-white mb-4">About Document Verification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <h4 className="text-white font-semibold mb-2">Supported Documents</h4>
              <ul className="space-y-1">
                <li>• PDF documents (original and signed)</li>
                <li>• Word documents (.doc, .docx)</li>
                <li>• Text files (.txt)</li>
                <li>• Image files (.jpg, .jpeg, .png)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Verification Process</h4>
              <ul className="space-y-1">
                <li>• Cryptographic signature validation</li>
                <li>• Document integrity checking</li>
                <li>• Signer identity verification</li>
                <li>• Timestamp validation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
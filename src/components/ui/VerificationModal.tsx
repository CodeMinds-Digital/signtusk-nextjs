'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Card } from './Card';
import { Button } from './Button';
import { SecurityIcons } from './DesignSystem';

interface VerificationData {
  isValid: boolean;
  details?: {
    fileName: string;
    fileSize: number;
    documentHash: string;
    signatures: Array<{
      signerId: string;
      signerName: string;
      timestamp: string;
      signature: string;
      isValid: boolean;
    }>;
    metadata?: {
      title: string;
      purpose: string;
      signerInfo: string;
    };
    verification_method: string;
    isSignedPDF: boolean;
    total_signatures: number;
    valid_signatures: number;
    originalHash?: string;
    signedHash?: string;
  };
  error?: string;
}

interface Document {
  id: string;
  fileName: string;
  status: string;
  createdAt: string;
  signedUrl?: string;
  originalUrl?: string;
  metadata?: {
    title?: string;
    purpose?: string;
    signerInfo?: string;
  };
}

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  verificationData: VerificationData | null;
  isLoading: boolean;
  showDetailed: boolean;
  onShowDetailed: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  document,
  verificationData,
  isLoading,
  showDetailed,
  onShowDetailed,
}) => {
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!document) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <SecurityIcons.Verified className="w-6 h-6 text-purple-400" />
            <span>🔍 {showDetailed ? 'Detailed Verification' : 'Document Verification'}</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
              <span className="text-white">⏳</span>
            </div>
            <p className="text-gray-300">Verifying document...</p>
          </div>
        ) : verificationData ? (
          <div className="space-y-6">
            {/* Basic Verification Status */}
            <div className={`p-6 rounded-xl border-2 ${verificationData.isValid
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
              }`}>
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${verificationData.isValid ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                  {verificationData.isValid ? (
                    <SecurityIcons.Verified className="w-8 h-8 text-green-400" />
                  ) : (
                    <SecurityIcons.Activity className="w-8 h-8 text-red-400" />
                  )}
                </div>
                <div>
                  <h4 className={`text-2xl font-bold ${verificationData.isValid ? 'text-green-300' : 'text-red-300'
                    }`}>
                    {verificationData.isValid ? 'Signature Valid' : 'Signature Invalid'}
                  </h4>
                  <p className={`${verificationData.isValid ? 'text-green-200' : 'text-red-200'
                    }`}>
                    {verificationData.isValid
                      ? 'Document signature has been successfully verified'
                      : 'Document signature verification failed'
                    }
                  </p>
                </div>
              </div>

              {verificationData.error && (
                <Card variant="outline" padding="md" className="border-red-500/30 bg-red-500/10 mb-4">
                  <div className="flex items-start space-x-3">
                    <SecurityIcons.Activity className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <h4 className="text-red-300 font-medium mb-1">Verification Error</h4>
                      <p className="text-red-200 text-sm">{verificationData.error}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Basic Document Info */}
            <Card variant="glass" padding="md">
              <h5 className="text-white font-semibold mb-3">📄 Document Information</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Document:</span>
                  <span className="text-white">{document.metadata?.title || document.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-white">{document.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Signatures:</span>
                  <span className="text-white">{verificationData.details?.total_signatures || 0}</span>
                </div>
                {verificationData.details?.documentHash && (
                  <div>
                    <span className="text-gray-400">Document Hash:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="font-mono text-xs text-gray-300 break-all bg-black/20 p-2 rounded flex-1">
                        {verificationData.details.documentHash}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(verificationData.details!.documentHash)}
                      >
                        📋
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Basic Signature Info */}
            {verificationData.details?.signatures && verificationData.details.signatures.length > 0 && (
              <Card variant="glass" padding="md">
                <h5 className="text-white font-semibold mb-3">✍️ Signers</h5>
                <div className="space-y-2">
                  {verificationData.details.signatures.slice(0, showDetailed ? undefined : 2).map((sig, index) => (
                    <div key={index} className="flex justify-between items-center bg-black/20 rounded p-2">
                      <div>
                        <p className="text-white font-medium">{sig.signerName || sig.signerId || 'Unknown Signer'}</p>
                        <p className="text-gray-400 text-xs">{sig.timestamp ? formatDate(sig.timestamp) : 'Timestamp not available'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${sig.isValid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                        {sig.isValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  ))}
                  {!showDetailed && verificationData.details.signatures.length > 2 && (
                    <p className="text-gray-400 text-sm">+{verificationData.details.signatures.length - 2} more signatures</p>
                  )}
                </div>
              </Card>
            )}

            {/* Detailed Analysis */}
            {showDetailed && verificationData.details && (
              <div className="space-y-6">
                {/* 📋 Detailed Signature Information */}
                {verificationData.details.signatures && verificationData.details.signatures.length > 0 && (
                  <Card variant="glass" padding="md">
                    <h5 className="text-white font-semibold mb-3 flex items-center space-x-2">
                      <SecurityIcons.Signature className="w-5 h-5 text-primary-400" />
                      <span>📋 Signature Details</span>
                    </h5>
                    <div className="space-y-4">
                      {verificationData.details.signatures.map((sig, index) => (
                        <div key={index} className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-600">
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
                              <p className="text-white">{formatDate(sig.timestamp)}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Signature Validity:</span>
                              <span className={`px-2 py-1 rounded text-xs ${sig.isValid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                {sig.isValid ? '✅ Valid' : '❌ Invalid'}
                              </span>
                            </div>
                            {sig.signature && (
                              <div className="md:col-span-2">
                                <span className="text-gray-400">Full Cryptographic Signature:</span>
                                <div className="flex items-center space-x-2 mt-1">
                                  <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded flex-1">
                                    {sig.signature}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(sig.signature)}
                                  >
                                    📋
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* 📄 Document Metadata */}
                {verificationData.details.metadata && (
                  <Card variant="glass" padding="md">
                    <h5 className="text-white font-semibold mb-3 flex items-center space-x-2">
                      <SecurityIcons.Document className="w-5 h-5 text-blue-400" />
                      <span>📄 Document Metadata</span>
                    </h5>
                    <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {verificationData.details.metadata.title && (
                          <div>
                            <span className="text-gray-400">Title:</span>
                            <p className="text-white">{verificationData.details.metadata.title}</p>
                          </div>
                        )}
                        {verificationData.details.metadata.purpose && (
                          <div>
                            <span className="text-gray-400">Purpose:</span>
                            <p className="text-white">{verificationData.details.metadata.purpose}</p>
                          </div>
                        )}
                        {verificationData.details.metadata.signerInfo && (
                          <div className="md:col-span-2">
                            <span className="text-gray-400">Signer Information:</span>
                            <p className="text-white">{verificationData.details.metadata.signerInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* 🔧 Technical Details */}
                <Card variant="glass" padding="md">
                  <h5 className="text-white font-semibold mb-3 flex items-center space-x-2">
                    <SecurityIcons.Shield className="w-5 h-5 text-yellow-400" />
                    <span>🔧 Technical Details</span>
                  </h5>
                  <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Verification Method:</span>
                        <p className="text-white">{verificationData.details.verification_method}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Is Signed PDF:</span>
                        <p className="text-white">{verificationData.details.isSignedPDF ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Valid Signatures:</span>
                        <p className="text-green-300">{verificationData.details.valid_signatures}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Total Signatures:</span>
                        <p className="text-white">{verificationData.details.total_signatures}</p>
                      </div>
                      {verificationData.details.originalHash && (
                        <div className="md:col-span-2">
                          <span className="text-gray-400">Original Hash:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded flex-1">
                              {verificationData.details.originalHash}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(verificationData.details!.originalHash!)}
                            >
                              📋
                            </Button>
                          </div>
                        </div>
                      )}
                      {verificationData.details.signedHash && verificationData.details.signedHash !== verificationData.details.originalHash && (
                        <div className="md:col-span-2">
                          <span className="text-gray-400">Signed Hash:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded flex-1">
                              {verificationData.details.signedHash}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(verificationData.details!.signedHash!)}
                            >
                              📋
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* 📄 Document Preview */}
                {document.signedUrl && (
                  <Card variant="glass" padding="md">
                    <h5 className="text-white font-semibold mb-3 flex items-center space-x-2">
                      <SecurityIcons.Document className="w-5 h-5 text-purple-400" />
                      <span>📄 Document Preview</span>
                    </h5>
                    <div className="bg-white rounded-lg p-4">
                      <iframe
                        src={document.signedUrl}
                        className="w-full h-96 border-0 rounded"
                        title="Verified Document Preview"
                      />
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <Button
                        onClick={() => window.open(document.signedUrl, '_blank')}
                        icon={<SecurityIcons.Document className="w-4 h-4" />}
                      >
                        📥 Download Document
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(verificationData.details!.documentHash)}
                      >
                        📋 Copy Hash
                      </Button>
                    </div>
                  </Card>
                )}

                {/* 📊 Audit Trail */}
                <Card variant="glass" padding="md">
                  <h5 className="text-white font-semibold mb-3 flex items-center space-x-2">
                    <SecurityIcons.Activity className="w-5 h-5 text-cyan-400" />
                    <span>📊 Audit Trail</span>
                  </h5>
                  <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-600">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Document Created:</span>
                        <span className="text-white">{formatDate(document.createdAt)}</span>
                      </div>
                      {verificationData.details.signatures?.map((sig, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-400">Signature {index + 1}:</span>
                          <span className="text-white">{sig.timestamp ? formatDate(sig.timestamp) : 'Unknown'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* ✅ Verification Summary */}
                {verificationData.isValid && (
                  <Card variant="glass" padding="md" className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                    <h5 className="text-lg font-bold text-green-300 mb-3 flex items-center space-x-2">
                      <SecurityIcons.Verified className="w-5 h-5 text-green-400" />
                      <span>✅ Verification Summary</span>
                    </h5>
                    <div className="space-y-2 text-sm text-green-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <p>Document signature has been cryptographically verified</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <p>Document integrity is confirmed - no tampering detected</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <p>Signer identity has been validated against blockchain records</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <p>Timestamp verification confirms signing date and time</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <p>This document can be trusted as authentic and unmodified</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Toggle Detailed View */}
            <div className="text-center">
              <Button
                onClick={onShowDetailed}
                variant="outline"
                icon={<SecurityIcons.Activity className="w-4 h-4" />}
              >
                {showDetailed ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-300">Failed to load verification data</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

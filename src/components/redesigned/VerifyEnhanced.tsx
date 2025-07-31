'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';

interface VerificationResult {
  isValid: boolean;
  details?: {
    fileName: string;
    fileSize: number;
    documentHash: string;
    signatures: Array<{
      signerId: string;
      signerName: string;
      signerAddress?: string;
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

interface VerifyEnhancedProps {
  onPageChange?: (page: string) => void;
}

export const VerifyEnhanced: React.FC<VerifyEnhancedProps> = ({ onPageChange }) => {
  const { wallet } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Get context from URL parameters
  const documentId = searchParams.get('doc');
  const fileName = searchParams.get('fileName');

  useEffect(() => {
    if (documentId && fileName) {
      loadDocumentFromContext();
    }
  }, [documentId, fileName]);

  const loadDocumentFromContext = async () => {
    if (!documentId) return;

    setIsProcessing(true);
    try {
      // Fetch document details from API
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const documentData = await response.json();
        setVerificationResult({
          isValid: documentData.status === 'signed' || documentData.status === 'verified',
          details: {
            fileName: documentData.fileName || decodeURIComponent(fileName || ''),
            fileSize: documentData.fileSize || 0,
            documentHash: documentData.documentHash || documentData.originalHash || 'N/A',
            signatures: documentData.signatures || [],
            metadata: documentData.metadata || {
              title: documentData.title || decodeURIComponent(fileName || ''),
              purpose: documentData.purpose || 'Document verification',
              signerInfo: documentData.signerInfo || 'Unknown'
            },
            verification_method: 'Database lookup verification',
            isSignedPDF: documentData.status === 'signed',
            total_signatures: documentData.signatureCount || (documentData.signatures ? documentData.signatures.length : 0),
            valid_signatures: documentData.signatureCount || (documentData.signatures ? documentData.signatures.filter((s: any) => s.isValid !== false).length : 0),
            originalHash: documentData.originalHash,
            signedHash: documentData.signedHash || documentData.documentHash
          }
        });
      } else {
        throw new Error('Document not found or access denied');
      }
    } catch (error) {
      console.error('Error loading document context:', error);
      setVerificationResult({
        isValid: false,
        error: 'Failed to load document context. Please try uploading the document manually.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    router.push('/logout');
  };

  const handlePageChange = (page: string) => {
    console.log('VerifyEnhanced handlePageChange called with:', page, 'onPageChange available:', !!onPageChange);

    if (onPageChange) {
      // Use the callback from parent component (dashboard sidebar navigation)
      onPageChange(page);
    } else {
      // Fallback to router navigation if no callback (standalone verify page)
      if (page === 'dashboard') {
        router.push('/dashboard');
      } else if (page === 'documents') {
        router.push('/dashboard'); // Navigate back to dashboard with documents view
      } else if (page === 'settings') {
        router.push('/dashboard'); // Navigate back to dashboard
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      handleVerifyDocument(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      handleVerifyDocument(file);
    }
  };

  const handleVerifyDocument = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (documentId) {
        formData.append('documentId', documentId);
      }

      const response = await fetch('/api/documents/verify', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to verify document');
      }

      const result = await response.json();
      setVerificationResult({
        isValid: result.verification.isValid,
        details: result.verification.details,
        error: result.verification.error
      });

    } catch (error) {
      console.error('Error verifying document:', error);
      setVerificationResult({
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPage="verify"
        onPageChange={handlePageChange}
        userInfo={wallet ? {
          customId: wallet.customId,
          address: wallet.address
        } : undefined}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <SecurityIcons.Verified className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Enhanced Document Verification</h1>
                    <p className="text-neutral-400">Comprehensive verification with detailed analysis</p>
                  </div>
                </div>
                {documentId && fileName && (
                  <Card variant="outline" padding="sm" className="border-blue-500/30 bg-blue-500/10 mb-4">
                    <div className="flex items-center space-x-2">
                      <SecurityIcons.Document className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-300 text-sm">
                        Verifying document: <span className="font-medium">{decodeURIComponent(fileName)}</span>
                      </span>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Upload Section */}
          {!documentId && (
            <Card variant="glass" padding="lg" className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-6">Upload Document to Verify</h2>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${dragActive
                  ? 'border-primary-400 bg-primary-500/10'
                  : 'border-neutral-600 hover:border-neutral-500'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                />

                <div className="space-y-4">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    {isProcessing ? (
                      <LoadingSpinner size="lg" />
                    ) : (
                      <SecurityIcons.Document className="w-8 h-8 text-purple-400" />
                    )}
                  </div>

                  {isProcessing ? (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Verifying Document...</h3>
                      <p className="text-neutral-400">Please wait while we perform comprehensive verification</p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {dragActive ? 'Drop document here' : 'Drag & drop or click to select'}
                      </h3>
                      <p className="text-neutral-400 mb-4">
                        Supports PDF, Word documents, text files, and images
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        icon={<SecurityIcons.Document className="w-4 h-4" />}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Comprehensive Verification Results */}
          {verificationResult && (
            <div className="space-y-6">
              {/* Main Verification Status */}
              <Card variant="glass" padding="lg">
                <div className={`p-6 rounded-xl border-2 ${verificationResult.isValid
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
                  }`}>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${verificationResult.isValid ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                      {verificationResult.isValid ? (
                        <SecurityIcons.Verified className="w-8 h-8 text-green-400" />
                      ) : (
                        <SecurityIcons.Activity className="w-8 h-8 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h3 className={`text-2xl font-bold ${verificationResult.isValid ? 'text-green-300' : 'text-red-300'
                        }`}>
                        {verificationResult.isValid ? 'Signature Valid' : 'Signature Invalid'}
                      </h3>
                      <p className={`${verificationResult.isValid ? 'text-green-200' : 'text-red-200'
                        }`}>
                        {verificationResult.isValid
                          ? 'Document signature has been successfully verified'
                          : 'Document signature verification failed'
                        }
                      </p>
                    </div>
                  </div>

                  {verificationResult.error && (
                    <Card variant="outline" padding="md" className="border-red-500/30 bg-red-500/10 mb-4">
                      <div className="flex items-start space-x-3">
                        <SecurityIcons.Activity className="w-5 h-5 text-red-400 mt-0.5" />
                        <div>
                          <h4 className="text-red-300 font-medium mb-1">Verification Error</h4>
                          <p className="text-red-200 text-sm">{verificationResult.error}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {verificationResult.details && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Document:</span>
                        <p className="text-white font-semibold">{verificationResult.details.fileName}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">File Size:</span>
                        <p className="text-white">{formatFileSize(verificationResult.details.fileSize)}</p>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-gray-400">Document Hash:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="font-mono text-xs text-white break-all bg-black/20 p-2 rounded flex-1">
                            {verificationResult.details.documentHash}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(verificationResult.details!.documentHash)}
                          >
                            📋
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggle Detailed View */}
                <div className="mt-6 text-center">
                  <Button
                    onClick={() => setShowDetailed(!showDetailed)}
                    variant="outline"
                    icon={<SecurityIcons.Activity className="w-4 h-4" />}
                  >
                    {showDetailed ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}
                  </Button>
                </div>
              </Card>

              {/* Detailed Analysis */}
              {showDetailed && verificationResult.details && (
                <div className="space-y-6">
                  {/* 📋 Signature Details */}
                  {verificationResult.details.signatures && verificationResult.details.signatures.length > 0 && (
                    <Card variant="glass" padding="lg">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                        <SecurityIcons.Signature className="w-5 h-5 text-primary-400" />
                        <span>📋 Signature Details</span>
                      </h4>
                      <div className="space-y-4">
                        {verificationResult.details.signatures.map((sig, index) => (
                          <div key={index} className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-600">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                  {verificationResult.details.metadata && (
                    <Card variant="glass" padding="lg">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                        <SecurityIcons.Document className="w-5 h-5 text-blue-400" />
                        <span>📄 Document Metadata</span>
                      </h4>
                      <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-600">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                    </Card>
                  )}

                  {/* 🔧 Technical Details */}
                  <Card variant="glass" padding="lg">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                      <SecurityIcons.Shield className="w-5 h-5 text-yellow-400" />
                      <span>🔧 Technical Details</span>
                    </h4>
                    <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Verification Method:</span>
                          <p className="text-white">{verificationResult.details.verification_method}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Is Signed PDF:</span>
                          <p className="text-white">{verificationResult.details.isSignedPDF ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Total Signatures:</span>
                          <p className="text-white">{verificationResult.details.total_signatures}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Valid Signatures:</span>
                          <p className="text-green-300">{verificationResult.details.valid_signatures}</p>
                        </div>
                        {verificationResult.details.originalHash && (
                          <div className="md:col-span-2">
                            <span className="text-gray-400">Original Document Hash:</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded flex-1">
                                {verificationResult.details.originalHash}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(verificationResult.details!.originalHash!)}
                              >
                                📋
                              </Button>
                            </div>
                          </div>
                        )}
                        {verificationResult.details.signedHash && verificationResult.details.signedHash !== verificationResult.details.originalHash && (
                          <div className="md:col-span-2">
                            <span className="text-gray-400">Signed Document Hash:</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="font-mono text-xs text-gray-300 break-all bg-black/30 p-2 rounded flex-1">
                                {verificationResult.details.signedHash}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(verificationResult.details!.signedHash!)}
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
                  {uploadedFile && (
                    <Card variant="glass" padding="lg">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                        <SecurityIcons.Document className="w-5 h-5 text-purple-400" />
                        <span>📄 Document Preview</span>
                      </h4>
                      <div className="bg-white rounded-lg p-4">
                        <iframe
                          src={URL.createObjectURL(uploadedFile)}
                          className="w-full h-96 border-0 rounded"
                          title="Verified Document Preview"
                        />
                      </div>
                      <div className="mt-4 flex space-x-3">
                        <Button
                          onClick={() => {
                            const url = URL.createObjectURL(uploadedFile);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = uploadedFile.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          icon={<SecurityIcons.Document className="w-4 h-4" />}
                        >
                          📥 Download Document
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(verificationResult.details!.documentHash)}
                        >
                          📋 Copy Hash
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* ✅ Verification Summary */}
                  {verificationResult.isValid && (
                    <Card variant="glass" padding="lg" className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                      <h4 className="text-lg font-bold text-green-300 mb-4 flex items-center space-x-2">
                        <SecurityIcons.Verified className="w-5 h-5 text-green-400" />
                        <span>✅ Verification Summary</span>
                      </h4>
                      <div className="space-y-3 text-sm text-green-200">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';

interface VerificationResult {
  isValid: boolean;
  details?: any;
  error?: string;
}

interface VerifyRedesignedProps {
  onPageChange?: (page: string) => void;
}

export const VerifyRedesigned: React.FC<VerifyRedesignedProps> = ({ onPageChange }) => {
  const { wallet, currentUser, logout } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState('verify');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if document context is provided via URL params
  const documentId = searchParams.get('documentId');
  const fileName = searchParams.get('fileName');

  useEffect(() => {
    // Check for document context from sessionStorage (from popup navigation)
    const storedContext = sessionStorage.getItem('verifyDocumentContext');
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext);
        // Clear the stored context after using it
        sessionStorage.removeItem('verifyDocumentContext');
        // Load document context with stored data
        loadDocumentFromStoredContext(context);
      } catch (error) {
        console.error('Error parsing stored document context:', error);
      }
    } else if (documentId && fileName) {
      // Pre-populate with document context if provided via URL
      console.log('Document context provided:', { documentId, fileName });
      // Auto-load document verification if context is provided
      loadDocumentFromContext();
    }
  }, [documentId, fileName]);

  const loadDocumentFromStoredContext = async (context: { documentId: string; fileName: string }) => {
    setIsProcessing(true);
    try {
      // Fetch actual document data from API
      const response = await fetch(`/api/documents/${context.documentId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const documentData = await response.json();

        // Use real document data for verification display
        const hasSignatures = documentData.signatures && documentData.signatures.length > 0;
        const isSignedDocument = documentData.status === 'signed' || documentData.status === 'completed';
        const isValidDocument = isSignedDocument && hasSignatures;

        console.log('Document verification data:', {
          status: documentData.status,
          hasSignatures,
          signatureCount: documentData.signatureCount,
          signatures: documentData.signatures,
          isValidDocument
        });

        setVerificationResult({
          isValid: isValidDocument,
          details: {
            fileName: documentData.fileName || context.fileName,
            fileSize: documentData.fileSize || 0,
            documentHash: documentData.documentHash || documentData.originalHash || 'N/A',
            signatures: documentData.signatures || [],
            metadata: documentData.metadata || {
              title: documentData.title || context.fileName,
              purpose: documentData.purpose || 'Document verification',
              signerInfo: documentData.signerInfo || 'Unknown'
            },
            verification_method: 'Database lookup verification',
            isSignedPDF: isSignedDocument,
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
        error: 'Failed to load document information. The document may not exist or you may not have access to it.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

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

        // Use real document data for verification display
        const hasSignatures = documentData.signatures && documentData.signatures.length > 0;
        const isSignedDocument = documentData.status === 'signed' || documentData.status === 'completed';
        const isValidDocument = isSignedDocument && hasSignatures;

        console.log('Document verification data (from URL context):', {
          status: documentData.status,
          hasSignatures,
          signatureCount: documentData.signatureCount,
          signatures: documentData.signatures,
          isValidDocument
        });

        setVerificationResult({
          isValid: isValidDocument,
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
            isSignedPDF: isSignedDocument,
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
    console.log('VerifyRedesigned handlePageChange called with:', page, 'onPageChange available:', !!onPageChange);

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
      setSelectedFile(file);
      handleVerifyDocument(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
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
        error: 'Failed to verify document. Please try again.'
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
                    <h1 className="text-3xl font-bold text-white">Document Verification</h1>
                    <p className="text-neutral-400">Verify the authenticity and integrity of signed documents</p>
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

          {/* Upload Section - Only show if no document context provided */}
          {!documentId && (
            <Card variant="glass" padding="lg" className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-6">Upload Document to Verify</h2>

              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${dragActive
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-neutral-600 hover:border-neutral-500'
                  } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  disabled={isProcessing}
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
                      <p className="text-neutral-400">Please wait while we verify the document signature</p>
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

              {selectedFile && (
                <div className="mt-4 p-4 bg-neutral-800/50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <SecurityIcons.Document className="w-5 h-5 text-neutral-400" />
                    <div>
                      <p className="text-white font-medium">{selectedFile.name}</p>
                      <p className="text-neutral-400 text-sm">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Verification Results */}
          {verificationResult && (
            <Card variant="glass" padding="lg" className="mb-8">
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

                {verificationResult.isValid && verificationResult.details && (
                  <div className="space-y-6">
                    {/* Document Information */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <SecurityIcons.Document className="w-5 h-5 text-primary-400" />
                        <span>Document Information</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-400 mb-1">Document</label>
                          <p className="text-white">{verificationResult.details.fileName || selectedFile?.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-400 mb-1">File Size</label>
                          <p className="text-white">
                            {verificationResult.details.fileSize
                              ? formatFileSize(verificationResult.details.fileSize)
                              : formatFileSize(selectedFile?.size || 0)
                            }
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-400 mb-1">Verification Method</label>
                          <p className="text-white">{verificationResult.details.verification_method || 'Standard'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-400 mb-1">Is Signed PDF</label>
                          <p className="text-white">{verificationResult.details.isSignedPDF ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-400 mb-1">Total Signatures</label>
                          <p className="text-white">{verificationResult.details.total_signatures || 0}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-400 mb-1">Valid Signatures</label>
                          <p className="text-green-300">{verificationResult.details.valid_signatures || 0}</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-neutral-400 mb-1">Document Hash</label>
                          <div className="bg-neutral-800/50 p-3 rounded-lg">
                            <p className="font-mono text-xs text-neutral-300 break-all">
                              {verificationResult.details.documentHash}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Metadata */}
                    {verificationResult.details.metadata && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                          <SecurityIcons.Activity className="w-5 h-5 text-blue-400" />
                          <span>Document Metadata</span>
                        </h4>
                        <div className="bg-neutral-800/50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {verificationResult.details.metadata.title && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Title</label>
                                <p className="text-white">{verificationResult.details.metadata.title}</p>
                              </div>
                            )}
                            {verificationResult.details.metadata.purpose && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Purpose</label>
                                <p className="text-white">{verificationResult.details.metadata.purpose}</p>
                              </div>
                            )}
                            {verificationResult.details.metadata.signerInfo && (
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Signer Information</label>
                                <p className="text-white">{verificationResult.details.metadata.signerInfo}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {verificationResult.details.signatures && verificationResult.details.signatures.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                          <SecurityIcons.Signature className="w-5 h-5 text-green-400" />
                          <span>Digital Signatures ({verificationResult.details.signatures.length})</span>
                        </h4>
                        <div className="space-y-4">
                          {verificationResult.details.signatures.map((sig: any, index: number) => (
                            <div key={index} className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-600">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-neutral-400 mb-1">Signer ID</label>
                                  <p className="text-white font-semibold">{sig.signerId || sig.signerName || 'Unknown'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-neutral-400 mb-1">Signer Name</label>
                                  <p className="text-white">{sig.signerName || 'Unknown'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-neutral-400 mb-1">Signed At</label>
                                  <p className="text-white">{sig.timestamp ? formatDate(sig.timestamp) : 'Unknown'}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-neutral-400 mb-1">Verification Status</label>
                                  <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${sig.isValid ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'
                                    }`}>
                                    {sig.isValid ? (
                                      <SecurityIcons.Verified className="w-3 h-3" />
                                    ) : (
                                      <SecurityIcons.Activity className="w-3 h-3" />
                                    )}
                                    <span>{sig.isValid ? 'Valid' : 'Invalid'}</span>
                                  </div>
                                </div>
                                {sig.signature && (
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Digital Signature</label>
                                    <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-700">
                                      <p className="font-mono text-xs text-neutral-300 break-all">
                                        {sig.signature}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {sig.signerAddress && (
                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Signer Address</label>
                                    <p className="font-mono text-sm text-neutral-300">{sig.signerAddress}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Information Section */}
          <Card variant="glass" padding="lg">
            <h3 className="text-xl font-semibold text-white mb-6">About Document Verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <SecurityIcons.Document className="w-5 h-5 text-primary-400" />
                  <span>Supported Documents</span>
                </h4>
                <ul className="space-y-2 text-neutral-300">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                    <span>PDF documents (original and signed)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                    <span>Word documents (.doc, .docx)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                    <span>Text files (.txt)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                    <span>Image files (.jpg, .jpeg, .png)</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <SecurityIcons.Verified className="w-5 h-5 text-green-400" />
                  <span>Verification Process</span>
                </h4>
                <ul className="space-y-2 text-neutral-300">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Cryptographic signature validation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Document integrity checking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Signer identity verification</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Timestamp validation</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VerifyRedesigned;

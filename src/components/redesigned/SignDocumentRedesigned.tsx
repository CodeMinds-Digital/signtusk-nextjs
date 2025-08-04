'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';

interface SigningResult {
  success: boolean;
  documentId?: string;
  signedUrl?: string;
  error?: string;
}

interface DocumentMetadata {
  title: string;
  purpose: string;
  signerInfo: string;
}

export const SignDocumentRedesigned: React.FC = () => {
  const { wallet } = useWallet();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [signingResult, setSigningResult] = useState<SigningResult | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata>({
    title: '',
    purpose: '',
    signerInfo: ''
  });

  // Add step-based workflow state
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'sign' | 'complete'>('upload');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Document type selection
  const [documentType, setDocumentType] = useState<'single' | 'multi'>('single');

  // Add error state for UI messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);

  const handleLogout = () => {
    router.push('/logout');
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
      clearError(); // Clear any previous error messages
      setDocumentMetadata(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ''),
        signerInfo: wallet?.customId || ''
      }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      clearError(); // Clear any previous error messages
      setDocumentMetadata(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ''),
        signerInfo: wallet?.customId || ''
      }));
    }
  };

  // Step 1: Upload document and metadata
  const handleUploadDocument = async (forceUpload: boolean = false) => {
    if (!selectedFile || !wallet) {
      alert('Please select a file and ensure you are logged in');
      return;
    }

    // If multi-signature is selected, redirect to multi-signature creation
    if (documentType === 'multi') {
      // Store the file and metadata in sessionStorage for the multi-signature flow
      const fileData = {
        file: selectedFile,
        metadata: documentMetadata,
        timestamp: Date.now()
      };

      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onload = () => {
        sessionStorage.setItem('pendingMultiSigDocument', JSON.stringify({
          ...fileData,
          fileData: reader.result,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type
        }));

        // Redirect to multi-signature creation
        router.push('/multi-signature?mode=create');
      };
      reader.readAsDataURL(selectedFile);
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('metadata', JSON.stringify(documentMetadata));
      if (forceUpload) {
        formData.append('forceUpload', 'true');
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle duplicate detection
        if (response.status === 409 && (result.error === 'duplicate_document' || result.error === 'duplicate_confirmation_required')) {
          const duplicateInfo = result.duplicate_info;

          if (duplicateInfo.action === 'block') {
            // Document already completed - show error in UI
            setErrorMessage(result.message);
            setDuplicateInfo(duplicateInfo);
            return;
          } else if (duplicateInfo.action === 'confirm') {
            // Show confirmation in UI instead of browser popup
            setErrorMessage(result.message);
            setDuplicateInfo(duplicateInfo);
            return;
          }
        } else {
          throw new Error(result.error || 'Failed to upload document');
        }
      } else if (result.success) {
        // Only proceed if response was successful AND result indicates success
        setDocumentId(result.document.id);
        setPdfPreviewUrl(result.preview_url);
        setCurrentStep('preview');
      }

    } catch (error) {
      console.error('Error uploading document:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle user response to duplicate detection
  const handleDuplicateConfirm = async () => {
    setErrorMessage(null);
    setDuplicateInfo(null);
    // Retry with force upload
    await handleUploadDocument(true);
  };

  const handleDuplicateCancel = () => {
    setErrorMessage(null);
    setDuplicateInfo(null);
  };

  const clearError = () => {
    setErrorMessage(null);
    setDuplicateInfo(null);
  };

  // Step 2: Accept document and proceed to signing
  const handleAcceptDocument = async () => {
    if (!documentId || !wallet) {
      alert('No document to accept or wallet not available');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/documents/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          action: 'accept'
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept document');
      }

      const result = await response.json();
      setCurrentStep('sign');

    } catch (error) {
      console.error('Error accepting document:', error);
      alert(error instanceof Error ? error.message : 'Failed to accept document');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 3: Sign the accepted document
  const handleSignAcceptedDocument = async () => {
    if (!documentId || !wallet) {
      alert('No document to sign or wallet not available');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/documents/sign-accepted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          private_key: wallet.privateKey
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign document');
      }

      const result = await response.json();
      setCurrentStep('complete');
      setSigningResult({
        success: true,
        documentId: result.document.id,
        signedUrl: result.download_urls.signed
      });

    } catch (error) {
      console.error('Error signing document:', error);
      setSigningResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign document'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset workflow
  const resetWorkflow = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setDocumentId(null);
    setPdfPreviewUrl(null);
    setSigningResult(null);
    setDocumentMetadata({ title: '', purpose: '', signerInfo: '' });
    clearError(); // Clear any error messages
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPage="sign-document"
        userInfo={wallet ? {
          customId: wallet.customId,
          address: wallet.address
        } : undefined}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Desktop Header with Tower Symbol */}
        <div className="hidden lg:flex items-center justify-between h-16 px-6 bg-neutral-900/30 backdrop-blur-sm border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <SecurityIcons.Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Sign Document</span>
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

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header - Mobile Only */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <SecurityIcons.Signature className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Single Signature Document</h1>
                    <div className="flex items-center space-x-4">
                      <p className="text-neutral-400">Model 1.1: Off-Chain Single Signature</p>
                      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-1 rounded-lg">
                        <span className="text-white text-sm font-semibold">
                          Signer ID: {wallet?.customId}
                        </span>
                      </div>
                      <div className="text-green-400 text-sm flex items-center">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                        Ready to Sign
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                icon={<SecurityIcons.Activity className="w-4 h-4" />}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          <Card variant="glass" padding="lg" className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Document Signing Workflow</h3>
              <Button
                onClick={resetWorkflow}
                variant="ghost"
                size="sm"
              >
                Reset
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-primary-400' : currentStep === 'preview' || currentStep === 'sign' || currentStep === 'complete' ? 'text-green-400' : 'text-neutral-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-primary-500' : currentStep === 'preview' || currentStep === 'sign' || currentStep === 'complete' ? 'bg-green-500' : 'bg-neutral-500'}`}>
                  {currentStep === 'upload' ? '1' : '✓'}
                </div>
                <span className="text-sm font-medium">Upload & Metadata</span>
              </div>
              <div className={`w-8 h-1 ${currentStep === 'preview' || currentStep === 'sign' || currentStep === 'complete' ? 'bg-green-400' : 'bg-neutral-400'}`}></div>
              <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-primary-400' : currentStep === 'sign' || currentStep === 'complete' ? 'text-green-400' : 'text-neutral-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' ? 'bg-primary-500' : currentStep === 'sign' || currentStep === 'complete' ? 'bg-green-500' : 'bg-neutral-500'}`}>
                  {currentStep === 'preview' ? '2' : currentStep === 'sign' || currentStep === 'complete' ? '✓' : '2'}
                </div>
                <span className="text-sm font-medium">Preview & Accept</span>
              </div>
              <div className={`w-8 h-1 ${currentStep === 'sign' || currentStep === 'complete' ? 'bg-green-400' : 'bg-neutral-400'}`}></div>
              <div className={`flex items-center space-x-2 ${currentStep === 'sign' ? 'text-primary-400' : currentStep === 'complete' ? 'text-green-400' : 'text-neutral-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'sign' ? 'bg-primary-500' : currentStep === 'complete' ? 'bg-green-500' : 'bg-neutral-500'}`}>
                  {currentStep === 'sign' ? '3' : currentStep === 'complete' ? '✓' : '3'}
                </div>
                <span className="text-sm font-medium">Sign Document</span>
              </div>
              <div className={`w-8 h-1 ${currentStep === 'complete' ? 'bg-green-400' : 'bg-neutral-400'}`}></div>
              <div className={`flex items-center space-x-2 ${currentStep === 'complete' ? 'text-green-400' : 'text-neutral-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'complete' ? 'bg-green-500' : 'bg-neutral-500'}`}>
                  {currentStep === 'complete' ? '✓' : '4'}
                </div>
                <span className="text-sm font-medium">Complete</span>
              </div>
            </div>
          </Card>

          {/* Step 1: Upload & Metadata */}
          {currentStep === 'upload' && (
            <Card variant="glass" padding="lg" className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-6">Step 1: Upload Document & Add Information</h2>
              <p className="text-neutral-400 mb-6">
                Select a PDF document and choose your signing workflow before proceeding to preview.
              </p>

              {/* Document Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Document Signing Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${documentType === 'single'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-neutral-600 hover:border-neutral-500'
                      }`}
                    onClick={() => setDocumentType('single')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${documentType === 'single' ? 'border-primary-500 bg-primary-500' : 'border-neutral-400'
                        }`}>
                        {documentType === 'single' && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Single Signer</h3>
                        <p className="text-neutral-400 text-sm">Sign the document yourself</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${documentType === 'multi'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-neutral-600 hover:border-neutral-500'
                      }`}
                    onClick={() => setDocumentType('multi')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${documentType === 'multi' ? 'border-primary-500 bg-primary-500' : 'border-neutral-400'
                        }`}>
                        {documentType === 'multi' && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Multiple Signers</h3>
                        <p className="text-neutral-400 text-sm">Require multiple people to sign</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />

                <div className="space-y-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <SecurityIcons.Document className="w-8 h-8 text-green-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {dragActive ? 'Drop document here' : 'Drag & drop or click to select'}
                    </h3>
                    <p className="text-neutral-400 mb-4">
                      Supports PDF, Word documents, and text files
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      icon={<SecurityIcons.Document className="w-4 h-4" />}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>

              {/* Selected File Info */}
              {selectedFile && (
                <Card variant="outline" padding="md" className="mt-4 border-green-500/30 bg-green-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <SecurityIcons.Document className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-white font-medium">{selectedFile.name}</p>
                        <p className="text-neutral-400 text-sm">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        clearError(); // Clear any error messages
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              )}

              {/* Document Metadata */}
              {selectedFile && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Document Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Document Title
                      </label>
                      <input
                        type="text"
                        value={documentMetadata.title}
                        onChange={(e) => setDocumentMetadata(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter document title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Purpose
                      </label>
                      <input
                        type="text"
                        value={documentMetadata.purpose}
                        onChange={(e) => setDocumentMetadata(prev => ({ ...prev, purpose: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., Contract, Agreement, Legal Document"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Signer Information
                      </label>
                      <input
                        type="text"
                        value={documentMetadata.signerInfo}
                        onChange={(e) => setDocumentMetadata(prev => ({ ...prev, signerInfo: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Signer name or identifier"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message Display */}
              {errorMessage && (
                <div className="mt-6 p-4 rounded-lg border border-red-500/20 bg-red-500/10">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-400 mb-1">
                        {duplicateInfo?.action === 'block' ? 'Upload Blocked' : 'Duplicate Document Detected'}
                      </h3>
                      <p className="text-sm text-red-300 mb-3">{errorMessage}</p>

                      {duplicateInfo?.action === 'confirm' && (
                        <div className="flex space-x-3">
                          <Button
                            onClick={handleDuplicateConfirm}
                            size="sm"
                            variant="primary"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Proceed Anyway
                          </Button>
                          <Button
                            onClick={handleDuplicateCancel}
                            size="sm"
                            variant="secondary"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      {duplicateInfo?.action === 'block' && (
                        <Button
                          onClick={clearError}
                          size="sm"
                          variant="secondary"
                        >
                          Choose Different Document
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => handleUploadDocument()}
                disabled={!selectedFile || isProcessing || Boolean(errorMessage && duplicateInfo?.action === 'block')}
                loading={isProcessing}
                fullWidth
                size="lg"
                icon={<SecurityIcons.Document className="w-5 h-5" />}
                className="mt-6"
              >
                {isProcessing ? 'Uploading Document...' : 'Upload & Continue to Preview'}
              </Button>
            </Card>
          )}

          {/* Step 2: Preview & Accept */}
          {currentStep === 'preview' && (
            <Card variant="glass" padding="lg" className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-6">Step 2: Preview & Accept Document</h2>
              <p className="text-neutral-400 mb-6">
                Review your document and accept it to proceed to signing.
              </p>

              {pdfPreviewUrl && (
                <div className="mb-6">
                  <iframe
                    src={pdfPreviewUrl}
                    className="w-full h-96 border border-neutral-600 rounded-lg"
                    title="Document Preview"
                  />
                </div>
              )}

              <div className="flex space-x-4">
                <Button
                  onClick={() => setCurrentStep('upload')}
                  variant="outline"
                  icon={<SecurityIcons.Activity className="w-4 h-4" />}
                >
                  Back to Upload
                </Button>
                <Button
                  onClick={handleAcceptDocument}
                  disabled={isProcessing}
                  loading={isProcessing}
                  fullWidth
                  size="lg"
                  icon={<SecurityIcons.Verified className="w-5 h-5" />}
                >
                  {isProcessing ? 'Accepting Document...' : 'Accept & Proceed to Sign'}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Sign Document */}
          {currentStep === 'sign' && (
            <Card variant="glass" padding="lg" className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-6">Step 3: Sign Document</h2>
              <p className="text-neutral-400 mb-6">
                Your signature will be cryptographically generated and embedded into the document.
              </p>

              <div className="space-y-3 text-sm text-neutral-300 mb-6">
                <p>• Your signature will be cryptographically generated using ECDSA</p>
                <p>• The document hash will be signed with your private key</p>
                <p>• A new PDF with embedded signature will be created</p>
                <p>• All actions will be logged for audit purposes</p>
              </div>

              <Button
                onClick={handleSignAcceptedDocument}
                disabled={isProcessing}
                loading={isProcessing}
                fullWidth
                size="lg"
                icon={<SecurityIcons.Signature className="w-5 h-5" />}
              >
                {isProcessing ? 'Signing Document...' : '🔐 Sign Document'}
              </Button>
            </Card>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && signingResult && (
            <Card variant="glass" padding="lg" className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-6">Step 4: Complete</h2>

              <div className={`p-6 rounded-xl border-2 ${signingResult.success
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
                }`}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${signingResult.success ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                    {signingResult.success ? (
                      <SecurityIcons.Verified className="w-8 h-8 text-green-400" />
                    ) : (
                      <SecurityIcons.Activity className="w-8 h-8 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${signingResult.success ? 'text-green-300' : 'text-red-300'
                      }`}>
                      {signingResult.success ? 'Document Signed Successfully!' : 'Signing Failed'}
                    </h3>
                    <p className={`${signingResult.success ? 'text-green-200' : 'text-red-200'
                      }`}>
                      {signingResult.success
                        ? 'Your document has been digitally signed and secured'
                        : 'There was an error signing your document'
                      }
                    </p>
                  </div>
                </div>

                {signingResult.error && (
                  <Card variant="outline" padding="md" className="border-red-500/30 bg-red-500/10 mb-4">
                    <div className="flex items-start space-x-3">
                      <SecurityIcons.Activity className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <h4 className="text-red-300 font-medium mb-1">Error Details</h4>
                        <p className="text-red-200 text-sm">{signingResult.error}</p>
                      </div>
                    </div>
                  </Card>
                )}

                {signingResult.success && signingResult.signedUrl && (
                  <div className="space-y-4">
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => window.open(signingResult.signedUrl, '_blank')}
                        icon={<SecurityIcons.Document className="w-4 h-4" />}
                      >
                        📥 Download Signed Document
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard')}
                        icon={<SecurityIcons.Activity className="w-4 h-4" />}
                      >
                        View in Dashboard
                      </Button>
                    </div>

                    {/* Success Summary */}
                    <Card variant="outline" padding="md" className="border-green-500/30 bg-green-500/10">
                      <h4 className="text-green-300 font-medium mb-2">✅ Signing Complete</h4>
                      <div className="space-y-1 text-sm text-green-200">
                        <p>• Document has been cryptographically signed</p>
                        <p>• Digital signature embedded in the document</p>
                        <p>• Signature recorded on blockchain for verification</p>
                        <p>• Document is now tamper-proof and verifiable</p>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Information Section */}
          <Card variant="glass" padding="lg">
            <h3 className="text-xl font-semibold text-white mb-6">About Digital Signing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <SecurityIcons.Shield className="w-5 h-5 text-primary-400" />
                  <span>Security Features</span>
                </h4>
                <ul className="space-y-2 text-neutral-300">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                    <span>Cryptographic signature verification</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                    <span>Blockchain-anchored proof</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                    <span>Tamper-proof document integrity</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                    <span>Non-repudiation guarantee</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <SecurityIcons.Document className="w-5 h-5 text-green-400" />
                  <span>Supported Formats</span>
                </h4>
                <ul className="space-y-2 text-neutral-300">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>PDF documents</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Word documents (.doc, .docx)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Text files (.txt)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Legal compliance ready</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div >
  );
};

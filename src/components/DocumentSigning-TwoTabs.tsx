'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';

interface DocumentMetadata {
  title: string;
  purpose: string;
  signerInfo: string;
}

type WorkflowStep = 'upload' | 'metadata' | 'preview' | 'accept' | 'sign' | 'complete';

export default function DocumentSigning() {
  const { wallet, isAuthenticated, currentUser, isLoading, hasWallet } = useWallet();
  const [activeTab, setActiveTab] = useState<'sign' | 'verify'>('sign');
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata>({
    title: '',
    purpose: '',
    signerInfo: ''
  });
  const [documentId, setDocumentId] = useState<string>('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    details?: any;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verifyFileInputRef = useRef<HTMLInputElement>(null);

  const hasValidAuth = (isAuthenticated && currentUser) || wallet || hasWallet;

  // All the existing handler functions remain the same
  const handleUploadDocument = async () => {
    if (!selectedFile || !wallet) {
      alert('Please select a file and ensure you are logged in');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('metadata', JSON.stringify(documentMetadata));

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      const result = await response.json();
      setDocumentId(result.document.id);
      setPdfPreviewUrl(result.preview_url);
      setCurrentStep('preview');
      
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocumentAction = async (action: 'accept' | 'reject') => {
    if (!documentId) {
      alert('No document to process');
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
          action: action
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} document`);
      }

      if (action === 'accept') {
        setCurrentStep('sign');
      } else {
        setCurrentStep('upload');
        setSelectedFile(null);
        setDocumentMetadata({ title: '', purpose: '', signerInfo: '' });
        setDocumentId('');
        setPdfPreviewUrl('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        alert('Document rejected. You can upload a new document.');
      }
      
    } catch (error) {
      console.error(`Error ${action}ing document:`, error);
      alert(`Failed to ${action} document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

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
      
      alert(`Document signed successfully! 
      
Original document: ${result.download_urls.original}
Signed document: ${result.download_urls.signed}`);
      
    } catch (error) {
      console.error('Error signing document:', error);
      alert(`Failed to sign document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWorkflow = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setDocumentMetadata({ title: '', purpose: '', signerInfo: '' });
    setDocumentId('');
    setPdfPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      const verification = result.verification;

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

  // Loading and auth checks remain the same
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <span className="text-white text-2xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Loading Document Signing...</h2>
          <p className="text-gray-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!hasValidAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 max-w-md mx-4">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Authentication Required</h2>
          <p className="text-gray-300 mb-6">
            Please login to access document signing features. You need a signing identity to sign documents.
          </p>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold"
            >
              Go to Homepage
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 font-semibold"
            >
              Login with Existing Identity
            </button>
            <button
              onClick={() => window.location.href = '/signup'}
              className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 font-semibold"
            >
              Create New Identity
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 max-w-md mx-4">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🔑</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Wallet Required</h2>
          <p className="text-gray-300 mb-6">
            You're authenticated but need to unlock your wallet to sign documents. Please login with your wallet password.
          </p>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold"
            >
              Login with Wallet
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Single Signature Document</h1>
              <div className="flex items-center space-x-4">
                <p className="text-gray-300">Model 1.1: Off-Chain Single Signature</p>
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-lg">
                  <span className="text-white text-sm font-semibold">
                    Signer ID: {wallet.customId}
                  </span>
                </div>
                <div className="text-green-400 text-sm flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Ready to Sign
                </div>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Tab Navigation - Only Sign and Verify */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 mb-8">
          <div className="flex border-b border-white/20">
            <button
              onClick={() => setActiveTab('sign')}
              className={`px-6 py-4 font-semibold transition-all duration-200 ${
                activeTab === 'sign'
                  ? 'text-white border-b-2 border-purple-500 bg-white/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Sign Document
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`px-6 py-4 font-semibold transition-all duration-200 ${
                activeTab === 'verify'
                  ? 'text-white border-b-2 border-purple-500 bg-white/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Verify Document
            </button>
          </div>

          <div className="p-6">
            {/* Sign Document Tab */}
            {activeTab === 'sign' && (
              <div className="space-y-6">
                {/* Progress Indicator */}
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Document Signing Workflow</h3>
                    <button
                      onClick={resetWorkflow}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-purple-400' : currentStep === 'preview' || currentStep === 'sign' || currentStep === 'complete' ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-purple-500' : currentStep === 'preview' || currentStep === 'sign' || currentStep === 'complete' ? 'bg-green-500' : 'bg-gray-500'}`}>
                        {currentStep === 'upload' ? '1' : '✓'}
                      </div>
                      <span className="text-sm font-medium">Upload & Metadata</span>
                    </div>
                    <div className={`w-8 h-1 ${currentStep === 'preview' || currentStep === 'sign' || currentStep === 'complete' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-purple-400' : currentStep === 'sign' || currentStep === 'complete' ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' ? 'bg-purple-500' : currentStep === 'sign' || currentStep === 'complete' ? 'bg-green-500' : 'bg-gray-500'}`}>
                        {currentStep === 'preview' ? '2' : currentStep === 'sign' || currentStep === 'complete' ? '✓' : '2'}
                      </div>
                      <span className="text-sm font-medium">Preview & Accept</span>
                    </div>
                    <div className={`w-8 h-1 ${currentStep === 'sign' || currentStep === 'complete' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <div className={`flex items-center space-x-2 ${currentStep === 'sign' ? 'text-purple-400' : currentStep === 'complete' ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'sign' ? 'bg-purple-500' : currentStep === 'complete' ? 'bg-green-500' : 'bg-gray-500'}`}>
                        {currentStep === 'sign' ? '3' : currentStep === 'complete' ? '✓' : '3'}
                      </div>
                      <span className="text-sm font-medium">Sign Document</span>
                    </div>
                    <div className={`w-8 h-1 ${currentStep === 'complete' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <div className={`flex items-center space-x-2 ${currentStep === 'complete' ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'complete' ? 'bg-green-500' : 'bg-gray-500'}`}>
                        {currentStep === 'complete' ? '✓' : '4'}
                      </div>
                      <span className="text-sm font-medium">Complete</span>
                    </div>
                  </div>
                </div>

                {/* Step 1: Upload & Metadata */}
                {currentStep === 'upload' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Step 1: Upload Document & Add Information</h3>
                      <p className="text-gray-300 mb-6">
                        Select a PDF document and provide optional metadata before proceeding to preview.
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                      <label className="block text-white font-semibold mb-4">Select PDF Document</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="block w-full text-gray-300 bg-white/10 border border-white/20 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                        accept=".pdf"
                      />
                      {selectedFile && (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-white font-semibold">{selectedFile.name}</p>
                          <p className="text-gray-400 text-sm">Size: {formatFileSize(selectedFile.size)}</p>
                          <p className="text-gray-400 text-sm">Type: {selectedFile.type}</p>
                        </div>
                      )}
                    </div>

                    {/* Document Metadata */}
                    <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                      <h4 className="text-white font-semibold mb-4">Document Information (Optional)</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">Document Title</label>
                          <input
                            type="text"
                            value={documentMetadata.title}
                            onChange={(e) => setDocumentMetadata(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g., Contract Agreement, Invoice, etc."
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">Purpose</label>
                          <input
                            type="text"
                            value={documentMetadata.purpose}
                            onChange={(e) => setDocumentMetadata(prev => ({ ...prev, purpose: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g., Legal agreement, Financial record, etc."
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">Signer Information</label>
                          <input
                            type="text"
                            value={documentMetadata.signerInfo}
                            onChange={(e) => setDocumentMetadata(prev => ({ ...prev, signerInfo: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g., John Doe - CEO, Jane Smith - Legal Representative"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleUploadDocument}
                      disabled={!selectedFile || isProcessing}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {isProcessing ? 'Uploading Document...' : 'Upload & Continue to Preview'}
                    </button>
                  </div>
                )}

                {/* Step 2: Preview & Accept */}
                {currentStep === 'preview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Step 2: Preview Document</h3>
                      <p className="text-gray-300 mb-6">
                        Review the document below and decide whether to accept or reject it for signing.
                      </p>
                    </div>

                    {/* PDF Preview */}
                    <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                      <h4 className="text-white font-semibold mb-4">Document Preview</h4>
                      {pdfPreviewUrl ? (
                        <div className="bg-white rounded-lg p-4">
                          <iframe
                            src={pdfPreviewUrl}
                            className="w-full h-96 border-0 rounded"
                            title="Document Preview"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-200 rounded-lg p-8 text-center">
                          <p className="text-gray-600">Loading document preview...</p>
                        </div>
                      )}
                    </div>

                    {/* Document Info */}
                    {selectedFile && (
                      <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                        <h4 className="text-white font-semibold mb-4">Document Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">File Name:</span>
                            <p className="text-white">{selectedFile.name}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">File Size:</span>
                            <p className="text-white">{formatFileSize(selectedFile.size)}</p>
                          </div>
                          {documentMetadata.title && (
                            <div>
                              <span className="text-gray-400">Title:</span>
                              <p className="text-white">{documentMetadata.title}</p>
                            </div>
                          )}
                          {documentMetadata.purpose && (
                            <div>
                              <span className="text-gray-400">Purpose:</span>
                              <p className="text-white">{documentMetadata.purpose}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Accept/Reject Buttons */}
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleDocumentAction('reject')}
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        {isProcessing ? 'Processing...' : '❌ Reject Document'}
                      </button>
                      <button
                        onClick={() => handleDocumentAction('accept')}
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        {isProcessing ? 'Processing...' : '✅ Accept & Continue to Sign'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Sign Document */}
                {currentStep === 'sign' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Step 3: Sign Document</h3>
                      <p className="text-gray-300 mb-6">
                        The document has been accepted. Click the button below to add your digital signature.
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                      <h4 className="text-white font-semibold mb-4">Ready to Sign</h4>
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                          <span className="text-green-400 text-xl mr-3">✅</span>
                          <div>
                            <p className="text-green-300 font-semibold">Document Accepted</p>
                            <p className="text-green-200 text-sm">The document is ready for your digital signature</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-sm text-gray-300">
                        <p>• Your signature will be cryptographically generated using ECDSA</p>
                        <p>• The document hash will be signed with your private key</p>
                        <p>• A new PDF with embedded signature will be created</p>
                        <p>• All actions will be logged for audit purposes</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSignAcceptedDocument}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {isProcessing ? 'Signing Document...' : '🔐 Sign Document'}
                    </button>
                  </div>
                )}

                {/* Step 4: Complete */}
                {currentStep === 'complete' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Step 4: Signing Complete</h3>
                      <p className="text-gray-300 mb-6">
                        Your document has been successfully signed and stored securely.
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                      <div className="text-center">
                        <div className="text-green-400 text-6xl mb-4">✅</div>
                        <h4 className="text-xl font-bold text-white mb-2">Document Signed Successfully!</h4>
                        <p className="text-gray-300 mb-6">
                          Your document has been cryptographically signed and is now available for download.
                        </p>
                        
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                          <div className="space-y-2 text-sm text-left">
                            <p className="text-green-300">✓ Document uploaded to secure storage</p>
                            <p className="text-green-300">✓ Cryptographic signature generated</p>
                            <p className="text-green-300">✓ Signed PDF created with embedded signature</p>
                            <p className="text-green-300">✓ New document hash generated</p>
                            <p className="text-green-300">✓ Audit logs updated</p>
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            onClick={resetWorkflow}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-semibold"
                          >
                            📄 Sign Another Document
                          </button>
                          <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold"
                          >
                            📋 View All Documents
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verify Document Tab - Simplified version */}
            {activeTab === 'verify' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Quick Document Verification</h3>
                  <p className="text-gray-300 mb-6">
                    Upload a document to quickly verify its signature. For detailed verification, use the dedicated verification page.
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
                    className="block w-full text-gray-300 bg-white/10 border border-white/20 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                </div>

                {verificationResult && (
                  <div className={`p-6 rounded-lg border ${
                    verificationResult.isValid 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-3">
                        {verificationResult.isValid ? '✅' : '❌'}
                      </span>
                      <h4 className={`text-xl font-bold ${
                        verificationResult.isValid ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {verificationResult.isValid ? 'Signature Valid' : 'Signature Invalid'}
                      </h4>
                    </div>
                    
                    {verificationResult.details && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-400">Document:</span>
                          <p className="text-white font-semibold">{verificationResult.details.fileName}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Signatures:</span>
                          <p className="text-white">{verificationResult.details.total_signatures || 0}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button
                        onClick={() => window.location.href = '/verify'}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-sm font-semibold"
                      >
                        View Detailed Verification
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
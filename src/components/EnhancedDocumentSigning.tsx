'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { signDocument, verifySignature } from '@/lib/signing';
import { generateDocumentHash, validateFile } from '@/lib/document';
import {
  generateSignedPDF,
  downloadSignedPDF,
  validatePDFFile,
  createVerificationQRData,
  SignatureData
} from '@/lib/pdf-signature';

interface DocumentMetadata {
  title: string;
  purpose: string;
  signerInfo: string;
}

interface SignedDocument {
  id: string;
  fileName: string;
  documentHash: string;
  signature: string;
  signerAddress: string;
  signerId: string;
  timestamp: string;
  fileSize: number;
  fileType: string;
  metadata?: DocumentMetadata;
  qrCodeData?: string;
  signedPdfBlob?: Blob;
}

type WorkflowStep = 'upload' | 'metadata' | 'hash' | 'sign' | 'store' | 'complete';

export default function EnhancedDocumentSigning() {
  const { wallet, getSignerId } = useWallet();
  const [activeTab, setActiveTab] = useState<'create' | 'verify' | 'documents'>('create');
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata>({
    title: '',
    purpose: '',
    signerInfo: ''
  });
  const [documentHash, setDocumentHash] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signedDocuments, setSignedDocuments] = useState<SignedDocument[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    details?: any;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verifyFileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Upload or Prepare Document
  const handleFileUpload = (file: File) => {
    // Validate file
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['.pdf', '.doc', '.docx', '.txt']
    });

    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    // Additional PDF validation if it's a PDF
    if (file.type.includes('pdf')) {
      const pdfValidation = validatePDFFile(file);
      if (!pdfValidation.isValid) {
        alert(pdfValidation.error);
        return;
      }
    }

    setSelectedFile(file);
    setCurrentStep('metadata');
  };

  const handleContinueToHash = () => {
    if (!selectedFile) return;
    setCurrentStep('hash');
  };

  // Step 3: Generate Hash & Sign Document
  const handleGenerateHash = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const hash = await generateDocumentHash(selectedFile);
      setDocumentHash(hash);
      setCurrentStep('sign');
    } catch (error) {
      console.error('Error generating hash:', error);
      alert('Failed to generate document hash');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignDocument = async () => {
    if (!documentHash || !wallet) return;

    setIsProcessing(true);
    try {
      const sig = await signDocument(documentHash, wallet.privateKey);
      setSignature(sig);
      setCurrentStep('store');
    } catch (error) {
      console.error('Error signing document:', error);
      alert('Failed to sign document');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 4: Store Signed Document
  const handleStoreDocument = async () => {
    if (!selectedFile || !wallet || !signature || !documentHash) return;

    setIsProcessing(true);
    try {
      // Create signature data for PDF generation
      const signerId = getSignerId();
      if (!signerId) {
        throw new Error('Unable to get signer ID');
      }

      const signatureData: SignatureData = {
        id: signerId,
        signerName: documentMetadata.signerInfo || signerId,
        signerId: signerId,
        signature,
        timestamp: new Date().toISOString()
      };

      // Generate QR code data for verification
      const qrCodeData = createVerificationQRData(documentHash, [signatureData]);

      // Generate signed PDF if original is PDF
      let signedPdfBlob: Blob | undefined;
      if (selectedFile.type.includes('pdf')) {
        signedPdfBlob = await generateSignedPDF(selectedFile, documentHash, [signatureData]);
      }

      // Create signed document record
      const signedDoc: SignedDocument = {
        id: Date.now().toString(),
        fileName: selectedFile.name,
        documentHash,
        signature,
        signerAddress: wallet.address,
        signerId: signerId,
        timestamp: new Date().toISOString(),
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        metadata: documentMetadata,
        qrCodeData,
        signedPdfBlob
      };

      // Store in local storage (in production, this would be stored in a secure database)
      const existingDocs = JSON.parse(localStorage.getItem('signedDocuments') || '[]');
      existingDocs.push(signedDoc);
      localStorage.setItem('signedDocuments', JSON.stringify(existingDocs));

      setSignedDocuments(existingDocs);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error storing document:', error);
      alert('Failed to store signed document');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 5: Verification Tools & Complete
  const handleDownloadSignedPDF = () => {
    const currentDoc = signedDocuments[signedDocuments.length - 1];
    if (currentDoc?.signedPdfBlob) {
      downloadSignedPDF(currentDoc.signedPdfBlob, `signed_${currentDoc.fileName}`);
    }
  };

  const handleStartNew = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setDocumentMetadata({ title: '', purpose: '', signerInfo: '' });
    setDocumentHash('');
    setSignature('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVerifyDocument = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const hash = await generateDocumentHash(file);

      // Check if this document exists in our signed documents
      const existingDocs = JSON.parse(localStorage.getItem('signedDocuments') || '[]');
      const matchingDoc = existingDocs.find((doc: SignedDocument) =>
        doc.documentHash === hash
      );

      if (matchingDoc) {
        const isValid = await verifySignature(hash, matchingDoc.signature, matchingDoc.signerAddress);
        setVerificationResult({
          isValid,
          details: {
            ...matchingDoc,
            documentHash: hash
          }
        });
      } else {
        setVerificationResult({
          isValid: false,
          error: 'Document not found in signed documents database'
        });
      }
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

  const loadSignedDocuments = () => {
    const docs = JSON.parse(localStorage.getItem('signedDocuments') || '[]');
    setSignedDocuments(docs);
  };

  React.useEffect(() => {
    loadSignedDocuments();
  }, []);

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

  const getStepStatus = (step: WorkflowStep) => {
    const steps: WorkflowStep[] = ['upload', 'metadata', 'hash', 'sign', 'store', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please login to access document signing features.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
          >
            Go to Login
          </button>
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
              <h1 className="text-3xl font-bold text-white mb-2">Enhanced Document Signing</h1>
              <p className="text-gray-300">Model 1.1: Off-Chain Single Signature with PDF Placement</p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 mb-8">
          <div className="flex border-b border-white/20">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-4 font-semibold transition-all duration-200 ${activeTab === 'create'
                ? 'text-white border-b-2 border-purple-500 bg-white/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Create New Document
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`px-6 py-4 font-semibold transition-all duration-200 ${activeTab === 'verify'
                ? 'text-white border-b-2 border-purple-500 bg-white/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Verify Document
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-4 font-semibold transition-all duration-200 ${activeTab === 'documents'
                ? 'text-white border-b-2 border-purple-500 bg-white/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              My Documents
            </button>
          </div>

          <div className="p-6">
            {/* Create New Document Tab */}
            {activeTab === 'create' && (
              <div className="space-y-8">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                  {[
                    { step: 'upload', label: 'Upload', icon: '📄' },
                    { step: 'metadata', label: 'Metadata', icon: '📝' },
                    { step: 'hash', label: 'Generate Hash', icon: '🔐' },
                    { step: 'sign', label: 'Sign', icon: '✍️' },
                    { step: 'store', label: 'Store', icon: '💾' },
                    { step: 'complete', label: 'Complete', icon: '✅' }
                  ].map(({ step, label, icon }, index) => {
                    const status = getStepStatus(step as WorkflowStep);
                    return (
                      <div key={step} className="flex items-center">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                          status === 'current' ? 'bg-purple-500 border-purple-500 text-white' :
                            'bg-gray-600 border-gray-600 text-gray-300'
                          }`}>
                          <span className="text-lg">{icon}</span>
                        </div>
                        <div className="ml-3">
                          <p className={`font-semibold ${status === 'completed' ? 'text-green-400' :
                            status === 'current' ? 'text-purple-400' :
                              'text-gray-400'
                            }`}>
                            {label}
                          </p>
                        </div>
                        {index < 5 && (
                          <div className={`w-16 h-0.5 mx-4 ${status === 'completed' ? 'bg-green-500' : 'bg-gray-600'
                            }`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Step Content */}
                {currentStep === 'upload' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Step 2: Upload or Prepare Document</h3>
                      <p className="text-gray-300 mb-6">
                        Select a file from your device (PDF or DOC format). The system supports documents up to 10MB.
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                      <label className="block text-white font-semibold mb-4">Select Document</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="block w-full text-gray-300 bg-white/10 border border-white/20 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                        accept=".pdf,.doc,.docx,.txt"
                      />

                      {selectedFile && (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-white font-semibold">{selectedFile.name}</p>
                          <p className="text-gray-400 text-sm">Size: {formatFileSize(selectedFile.size)}</p>
                          <p className="text-gray-400 text-sm">Type: {selectedFile.type}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 'metadata' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Document Metadata</h3>
                      <p className="text-gray-300 mb-6">
                        Optionally, fill in metadata such as title, purpose, and signer information.
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-6 space-y-4">
                      <div>
                        <label className="block text-white font-semibold mb-2">Title</label>
                        <input
                          type="text"
                          value={documentMetadata.title}
                          onChange={(e) => setDocumentMetadata(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Document title (optional)"
                          className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-white font-semibold mb-2">Purpose</label>
                        <textarea
                          value={documentMetadata.purpose}
                          onChange={(e) => setDocumentMetadata(prev => ({ ...prev, purpose: e.target.value }))}
                          placeholder="Purpose of this document (optional)"
                          className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-white font-semibold mb-2">Signer Information</label>
                        <input
                          type="text"
                          value={documentMetadata.signerInfo}
                          onChange={(e) => setDocumentMetadata(prev => ({ ...prev, signerInfo: e.target.value }))}
                          placeholder="Your name or organization (optional)"
                          className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleContinueToHash}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {currentStep === 'hash' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Step 3: Generate Hash & Sign Document</h3>
                      <p className="text-gray-300 mb-6">
                        Generate a cryptographic hash of the uploaded document to ensure integrity.
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white font-semibold">Document Hash</span>
                        {documentHash && (
                          <span className="text-green-400 text-sm">✅ Generated</span>
                        )}
                      </div>

                      {documentHash ? (
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <p className="font-mono text-xs text-gray-300 break-all">{documentHash}</p>
                        </div>
                      ) : (
                        <button
                          onClick={handleGenerateHash}
                          disabled={isProcessing}
                          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                          {isProcessing ? 'Generating Hash...' : 'Generate Hash'}
                        </button>
                      )}
                    </div>

                    {documentHash && (
                      <button
                        onClick={handleSignDocument}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        {isProcessing ? 'Signing Document...' : 'Sign Document'}
                      </button>
                    )}
                  </div>
                )}

                {currentStep === 'sign' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Document Signed Successfully</h3>
                      <p className="text-gray-300 mb-6">
                        Your document has been cryptographically signed. Review the signature details below.
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-lg border border-white/10 p-6 space-y-4">
                      <div>
                        <span className="text-gray-400">Document Hash:</span>
                        <p className="font-mono text-xs text-gray-300 break-all">{documentHash}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Signature:</span>
                        <p className="font-mono text-xs text-gray-300 break-all">{signature}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Signer ID:</span>
                        <p className="text-white">{wallet.customId}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Timestamp:</span>
                        <p className="text-white">{new Date().toLocaleString()}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleStoreDocument}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {isProcessing ? 'Storing Document...' : 'Store Signed Document'}
                    </button>
                  </div>
                )}

                {currentStep === 'store' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Step 4: Document Stored Successfully</h3>
                      <p className="text-gray-300 mb-6">
                        The signed document has been saved to secure off-chain storage with timestamp and signature metadata.
                      </p>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <span className="text-2xl mr-3">✅</span>
                        <h4 className="text-xl font-bold text-green-300">Document Successfully Stored</h4>
                      </div>
                      <p className="text-gray-300">
                        Your document has been cryptographically signed and stored securely.
                        A confirmation message is displayed with timestamp, file reference, and signature metadata.
                      </p>
                    </div>

                    <button
                      onClick={() => setCurrentStep('complete')}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold"
                    >
                      Continue to Verification Tools
                    </button>
                  </div>
                )}

                {currentStep === 'complete' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Step 5: Verification Tools</h3>
                      <p className="text-gray-300 mb-6">
                        Your document is now available in the "My Documents" section with verification tools.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                        <h4 className="text-lg font-bold text-white mb-4">Available Actions</h4>
                        <ul className="space-y-2 text-gray-300">
                          <li className="flex items-center">
                            <span className="text-green-400 mr-2">✅</span>
                            Verify signature and hash integrity
                          </li>
                          <li className="flex items-center">
                            <span className="text-blue-400 mr-2">📄</span>
                            Download signed PDF
                          </li>
                          <li className="flex items-center">
                            <span className="text-purple-400 mr-2">🔍</span>
                            QR code for quick access
                          </li>
                        </ul>
                      </div>

                      <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                        <h4 className="text-lg font-bold text-white mb-4">Verification Details</h4>
                        <ul className="space-y-2 text-gray-300 text-sm">
                          <li>• Signature hash validation</li>
                          <li>• Signer identity metadata</li>
                          <li>• Timestamp verification</li>
                          <li>• Document integrity check</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      {selectedFile?.type.includes('pdf') && (
                        <button
                          onClick={handleDownloadSignedPDF}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-semibold"
                        >
                          Download Signed PDF
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('documents')}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold"
                      >
                        View My Documents
                      </button>
                      <button
                        onClick={handleStartNew}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold"
                      >
                        Sign Another Document
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verify Document Tab */}
            {activeTab === 'verify' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Verify Document Signature</h3>
                  <p className="text-gray-300 mb-6">
                    Upload a document to verify its signature and validate integrity.
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
                    accept=".pdf,.doc,.docx,.txt"
                  />
                </div>

                {verificationResult && (
                  <div className={`p-6 rounded-lg border ${verificationResult.isValid
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                    }`}>
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-3">
                        {verificationResult.isValid ? '✅' : '❌'}
                      </span>
                      <h4 className={`text-xl font-bold ${verificationResult.isValid ? 'text-green-300' : 'text-red-300'
                        }`}>
                        {verificationResult.isValid ? 'Signature Valid' : 'Signature Invalid'}
                      </h4>
                    </div>

                    {verificationResult.details && (
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-300">
                          <span className="font-semibold">Document:</span> {verificationResult.details.fileName}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Hash:</span>
                          <span className="font-mono text-xs ml-2">{verificationResult.details.documentHash}</span>
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Signer ID:</span> {verificationResult.details.signerId}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Signed:</span> {formatDate(verificationResult.details.timestamp)}
                        </p>
                        {verificationResult.details.metadata?.title && (
                          <p className="text-gray-300">
                            <span className="font-semibold">Title:</span> {verificationResult.details.metadata.title}
                          </p>
                        )}
                      </div>
                    )}

                    {verificationResult.error && (
                      <p className="text-red-300">{verificationResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* My Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">My Documents</h3>
                  <p className="text-gray-300 mb-6">
                    View all documents you have signed with verification tools and download options.
                  </p>
                </div>

                {signedDocuments.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-6xl mb-4">📄</div>
                    <h4 className="text-xl font-bold text-white mb-2">No Documents Signed</h4>
                    <p className="text-gray-400">Start signing documents to see your collection here.</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                    >
                      Create New Document
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {signedDocuments.map((doc) => (
                      <div key={doc.id} className="bg-white/5 rounded-lg border border-white/10 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-white">
                              {doc.metadata?.title || doc.fileName}
                            </h4>
                            <p className="text-gray-400 text-sm">Signed: {formatDate(doc.timestamp)}</p>
                            {doc.metadata?.purpose && (
                              <p className="text-gray-300 text-sm mt-1">{doc.metadata.purpose}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm">Size: {formatFileSize(doc.fileSize)}</p>
                            <p className="text-gray-400 text-sm">Type: {doc.fileType}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm mb-4">
                          <div>
                            <span className="text-gray-400">Document Hash:</span>
                            <p className="font-mono text-xs text-gray-300 break-all">{doc.documentHash}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Signature:</span>
                            <p className="font-mono text-xs text-gray-300 break-all">{doc.signature}</p>
                          </div>
                        </div>

                        <div className="flex space-x-3">
                          <button className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-all duration-200 border border-green-500/30 text-sm">
                            ✅ Verify
                          </button>
                          {doc.signedPdfBlob && (
                            <button
                              onClick={() => downloadSignedPDF(doc.signedPdfBlob!, `signed_${doc.fileName}`)}
                              className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30 text-sm"
                            >
                              📄 Download PDF
                            </button>
                          )}
                          <button className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition-all duration-200 border border-purple-500/30 text-sm">
                            📱 QR Code
                          </button>
                        </div>
                      </div>
                    ))}
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
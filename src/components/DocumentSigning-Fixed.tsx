'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
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

export default function DocumentSigning() {
  // SIMPLIFIED: Use more flexible authentication logic
  const { wallet, isAuthenticated, currentUser, isLoading, hasWallet } = useWallet();
  const [activeTab, setActiveTab] = useState<'sign' | 'verify' | 'history'>('sign');
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata>({
    title: '',
    purpose: '',
    signerInfo: ''
  });
  const [documentHash, setDocumentHash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signedDocuments, setSignedDocuments] = useState<SignedDocument[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    details?: any;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verifyFileInputRef = useRef<HTMLInputElement>(null);

  // SIMPLIFIED: More flexible authentication check
  // If user has a session OR a wallet, allow access
  const hasValidAuth = (isAuthenticated && currentUser) || wallet || hasWallet;

  // Model 1.1: Single Signature Document Signing
  const handleSignDocument = async () => {
    if (!selectedFile || !wallet) {
      alert('Please select a file and ensure you are logged in');
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1: Generate Document Hash
      const documentHash = await generateDocumentHash(selectedFile);
      
      // Step 2: Sign the Hash Off-Chain
      const signature = await signDocument(documentHash, wallet.privateKey);
      
      // Step 3: Store Document and Signature Off-Chain (in local storage for demo)
      const signedDoc: SignedDocument = {
        id: Date.now().toString(),
        fileName: selectedFile.name,
        documentHash,
        signature,
        signerAddress: wallet.address,
        signerId: wallet.customId,
        timestamp: new Date().toISOString(),
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      };

      // Store in local storage (in production, this would be stored in a secure database)
      const existingDocs = JSON.parse(localStorage.getItem('signedDocuments') || '[]');
      existingDocs.push(signedDoc);
      localStorage.setItem('signedDocuments', JSON.stringify(existingDocs));
      
      setSignedDocuments(existingDocs);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      alert('Document signed successfully!');
    } catch (error) {
      console.error('Error signing document:', error);
      alert('Failed to sign document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyDocument = async (file: File, providedSignature?: string) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Generate hash of the uploaded document
      const documentHash = await generateDocumentHash(file);
      
      // If signature is provided, verify it
      if (providedSignature) {
        const isValid = await verifySignature(documentHash, providedSignature);
        setVerificationResult({
          isValid,
          details: {
            documentHash,
            fileName: file.name,
            fileSize: file.size,
            signature: providedSignature
          }
        });
      } else {
        // Check if this document exists in our signed documents
        const existingDocs = JSON.parse(localStorage.getItem('signedDocuments') || '[]');
        const matchingDoc = existingDocs.find((doc: SignedDocument) => 
          doc.documentHash === documentHash && doc.fileName === file.name
        );
        
        if (matchingDoc) {
          const isValid = await verifySignature(documentHash, matchingDoc.signature);
          setVerificationResult({
            isValid,
            details: {
              ...matchingDoc,
              documentHash
            }
          });
        } else {
          setVerificationResult({
            isValid: false,
            error: 'Document not found in signed documents database'
          });
        }
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

  // Show loading while checking authentication
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

  // SIMPLIFIED: Show auth required only if no valid auth at all
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

  // Show wallet required message if authenticated but no wallet loaded
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
              <h1 className="text-3xl font-bold text-white mb-2">Document Signing</h1>
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

        {/* Tab Navigation */}
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
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-4 font-semibold transition-all duration-200 ${
                activeTab === 'history'
                  ? 'text-white border-b-2 border-purple-500 bg-white/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Signing History
            </button>
          </div>

          <div className="p-6">
            {/* Sign Document Tab */}
            {activeTab === 'sign' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Sign a Document</h3>
                  <p className="text-gray-300 mb-6">
                    Upload a document to create a cryptographic signature. The document will be hashed and signed with your private key.
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                  <label className="block text-white font-semibold mb-4">Select Document</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-gray-300 bg-white/10 border border-white/20 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  {selectedFile && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-white font-semibold">{selectedFile.name}</p>
                      <p className="text-gray-400 text-sm">Size: {formatFileSize(selectedFile.size)}</p>
                      <p className="text-gray-400 text-sm">Type: {selectedFile.type}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSignDocument}
                  disabled={!selectedFile || isProcessing}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isProcessing ? 'Signing Document...' : 'Sign Document'}
                </button>
              </div>
            )}

            {/* Verify Document Tab */}
            {activeTab === 'verify' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Verify Document Signature</h3>
                  <p className="text-gray-300 mb-6">
                    Upload a document to verify its signature. The system will check if the document has been signed and verify the signature's authenticity.
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
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-300">
                          <span className="font-semibold">Document:</span> {verificationResult.details.fileName}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Hash:</span> 
                          <span className="font-mono text-xs ml-2">{verificationResult.details.documentHash}</span>
                        </p>
                        {verificationResult.details.signerId && (
                          <p className="text-gray-300">
                            <span className="font-semibold">Signer ID:</span> {verificationResult.details.signerId}
                          </p>
                        )}
                        {verificationResult.details.timestamp && (
                          <p className="text-gray-300">
                            <span className="font-semibold">Signed:</span> {formatDate(verificationResult.details.timestamp)}
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

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Signing History</h3>
                  <p className="text-gray-300 mb-6">
                    View all documents you have signed with this identity.
                  </p>
                </div>

                {signedDocuments.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-6xl mb-4">📄</div>
                    <h4 className="text-xl font-bold text-white mb-2">No Documents Signed</h4>
                    <p className="text-gray-400">Start signing documents to see your history here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {signedDocuments.map((doc) => (
                      <div key={doc.id} className="bg-white/5 rounded-lg border border-white/10 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-white">{doc.fileName}</h4>
                            <p className="text-gray-400 text-sm">Signed: {formatDate(doc.timestamp)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm">Size: {formatFileSize(doc.fileSize)}</p>
                            <p className="text-gray-400 text-sm">Type: {doc.fileType}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Document Hash:</span>
                            <p className="font-mono text-xs text-gray-300 break-all">{doc.documentHash}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Signature:</span>
                            <p className="font-mono text-xs text-gray-300 break-all">{doc.signature}</p>
                          </div>
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
'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { signDocument, verifySignature } from '@/lib/signing';
import { generateDocumentHash } from '@/lib/document';
import {
  uploadFileToSupabase,
  downloadFileFromSupabase,
  uploadBlobToSupabase,
  getPublicUrl
} from '@/lib/supabase-storage';
import {
  insertSignaturesIntoPDF,
  createSignatureData,
  createStampData,
  validatePDFForSigning,
  SignatureData
} from '@/lib/pdf-signature-insert';
import {
  DocumentDatabase,
  AuditLogger,
  DocumentRecord,
  SignatureRecord
} from '@/lib/database';

interface DocumentMetadata {
  title: string;
  purpose: string;
  signerInfo: string;
}

type WorkflowStep = 'upload' | 'preview' | 'accept' | 'sign' | 'complete';

export default function IntegratedDocumentSigning() {
  const { wallet } = useWallet();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata>({
    title: '',
    purpose: '',
    signerInfo: ''
  });
  const [currentDocumentId, setCurrentDocumentId] = useState<string>('');
  const [uploadedPath, setUploadedPath] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [documentHash, setDocumentHash] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [signedDocumentHash, setSignedDocumentHash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signedDocuments, setSignedDocuments] = useState<DocumentRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Upload & Preview Document with Database Integration
  const handleFileUpload = async (file: File) => {
    // Validate PDF file
    const validation = validatePDFForSigning(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsProcessing(true);
    try {
      // Generate document hash
      const hash = await generateDocumentHash(file);
      setDocumentHash(hash);

      // Upload to Supabase Storage
      const uploadPath = `documents/${wallet?.customId}/${Date.now()}_${file.name}`;
      const { data, error, publicUrl } = await uploadFileToSupabase(file, 'documents', uploadPath);

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Create document record in database
      const documentRecord = await DocumentDatabase.createDocument({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        original_hash: hash,
        supabase_path: uploadPath,
        public_url: publicUrl,
        status: 'uploaded',
        metadata: {
          uploader_id: wallet?.customId,
          uploader_address: wallet?.address,
          title: documentMetadata.title,
          purpose: documentMetadata.purpose
        }
      });

      setCurrentDocumentId(documentRecord.id!);

      // Log upload audit
      await AuditLogger.logDocumentUpload(
        documentRecord.id!,
        wallet?.customId!,
        {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          supabase_path: uploadPath,
          original_hash: hash
        }
      );

      setSelectedFile(file);
      setUploadedPath(uploadPath);
      setPreviewUrl(publicUrl || '');
      setCurrentStep('preview');

      console.log('Document uploaded successfully to:', uploadPath);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Preview Document from Supabase with Database Logging
  const handleDocumentPreview = async () => {
    if (!currentDocumentId || !wallet) return;

    try {
      // Update document status to previewed
      await DocumentDatabase.updateDocument(currentDocumentId, {
        status: 'previewed'
      });

      // Log preview audit
      await AuditLogger.logDocumentPreview(
        currentDocumentId,
        wallet.customId,
        {
          preview_url: previewUrl,
          action: 'document_previewed'
        }
      );

      setCurrentStep('accept');
    } catch (error) {
      console.error('Error logging preview:', error);
      // Continue anyway
      setCurrentStep('accept');
    }
  };

  // Step 3: Read & Accept Flow with Database Integration
  const handleDocumentAccept = async () => {
    if (!selectedFile || !wallet || !currentDocumentId) {
      alert('Missing file or wallet information');
      return;
    }

    setIsProcessing(true);
    try {
      // Update document status to accepted
      await DocumentDatabase.updateDocument(currentDocumentId, {
        status: 'accepted',
        metadata: {
          ...documentMetadata,
          uploader_id: wallet.customId,
          uploader_address: wallet.address,
          accepted_at: new Date().toISOString()
        }
      });

      // Log acceptance audit
      await AuditLogger.logDocumentAccepted(
        currentDocumentId,
        wallet.customId,
        {
          document_metadata: documentMetadata,
          action: 'document_accepted'
        }
      );

      // Sign the document hash
      const sig = await signDocument(documentHash, wallet.privateKey);
      setSignature(sig);

      // Trigger signature insertion
      await insertSignatureIntoPDF();

    } catch (error) {
      console.error('Error in accept flow:', error);
      alert('Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 4: Insert Signature and Generate New Hash with Database Integration
  const insertSignatureIntoPDF = async () => {
    if (!selectedFile || !wallet || !uploadedPath || !currentDocumentId) {
      throw new Error('Missing required data for signature insertion');
    }

    try {
      // Download the original PDF from Supabase
      const { data: pdfBlob, error } = await downloadFileFromSupabase('documents', uploadedPath);

      if (error || !pdfBlob) {
        throw new Error('Failed to download PDF from Supabase');
      }

      // Convert blob to Uint8Array
      const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());

      // Create signature data
      const signatureData: SignatureData = createSignatureData(
        documentMetadata.signerInfo || wallet.customId,
        wallet.customId,
        new Date().toISOString()
      );

      // Create stamp data
      const stampData = createStampData('SIGNED', 'Helvetica-Bold', 15);

      // Insert signatures using sign_insert logic
      const signedPdfBytes = await insertSignaturesIntoPDF(
        pdfBytes,
        [signatureData],
        stampData
      );

      // Create blob from signed PDF
      const signedPdfBlob = new Blob([new Uint8Array(signedPdfBytes)], { type: 'application/pdf' });

      // Generate new hash of signed PDF
      const signedFile = new File([signedPdfBlob], `signed_${selectedFile.name}`, { type: 'application/pdf' });
      const newHash = await generateDocumentHash(signedFile);
      setSignedDocumentHash(newHash);

      // Upload signed PDF to Supabase as new version
      const signedPath = `signed/${wallet.customId}/${Date.now()}_signed_${selectedFile.name}`;
      const { data, error: uploadError, publicUrl } = await uploadBlobToSupabase(
        signedPdfBlob,
        'documents',
        signedPath,
        'application/pdf'
      );

      if (uploadError) {
        throw new Error(`Failed to upload signed PDF: ${uploadError.message}`);
      }

      // Update document record with signed information
      await DocumentDatabase.updateDocument(currentDocumentId, {
        status: 'signed',
        signed_hash: newHash,
        signed_supabase_path: signedPath,
        signed_public_url: publicUrl
      });

      // Create signature record
      await DocumentDatabase.createSignature({
        document_id: currentDocumentId,
        signer_id: wallet.customId,
        signer_address: wallet.address,
        signature: signature,
        signature_type: 'single',
        signature_metadata: {
          signer_name: documentMetadata.signerInfo || wallet.customId,
          signature_method: 'sign_insert',
          signed_hash: newHash,
          original_hash: documentHash
        }
      });

      // Log signing audit
      await AuditLogger.logDocumentSigned(
        currentDocumentId,
        wallet.customId,
        {
          signed_hash: newHash,
          signed_path: signedPath,
          signature_method: 'sign_insert',
          action: 'document_signed'
        }
      );

      // Load updated documents
      await loadSignedDocuments();

      setCurrentStep('complete');
      console.log('Signed PDF uploaded successfully to:', signedPath);

    } catch (error) {
      console.error('Error inserting signature:', error);
      throw error;
    }
  };

  // Load signed documents from database
  const loadSignedDocuments = async () => {
    if (!wallet) return;

    try {
      const documents = await DocumentDatabase.getDocumentsBySignerId(wallet.customId);
      setSignedDocuments(documents);
    } catch (error) {
      console.error('Error loading signed documents:', error);
      // Fallback to empty array
      setSignedDocuments([]);
    }
  };

  React.useEffect(() => {
    if (wallet) {
      loadSignedDocuments();
    }
  }, [wallet]);

  const handleStartNew = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setDocumentMetadata({ title: '', purpose: '', signerInfo: '' });
    setCurrentDocumentId('');
    setUploadedPath('');
    setPreviewUrl('');
    setDocumentHash('');
    setSignature('');
    setSignedDocumentHash('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const getStepStatus = (step: WorkflowStep) => {
    const steps: WorkflowStep[] = ['upload', 'preview', 'accept', 'sign', 'complete'];
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
          <p className="text-gray-300 mb-6">Please login to access integrated document signing.</p>
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
              <h1 className="text-3xl font-bold text-white mb-2">Integrated Document Signing</h1>
              <p className="text-gray-300">Model 1.1 with Supabase Database & Audit Logging</p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex items-center justify-between">
            {[
              { step: 'upload', label: 'Upload & Store', icon: '📤' },
              { step: 'preview', label: 'Preview & Log', icon: '👁️' },
              { step: 'accept', label: 'Accept & Audit', icon: '✅' },
              { step: 'sign', label: 'Sign & Record', icon: '✍️' },
              { step: 'complete', label: 'Complete & Archive', icon: '🎉' }
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
                    <p className={`font-semibold text-sm ${status === 'completed' ? 'text-green-400' :
                      status === 'current' ? 'text-purple-400' :
                        'text-gray-400'
                      }`}>
                      {label}
                    </p>
                  </div>
                  {index < 4 && (
                    <div className={`w-16 h-0.5 mx-4 ${status === 'completed' ? 'bg-green-500' : 'bg-gray-600'
                      }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          {/* Step 1: Upload Document */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Step 1: Upload Document with Database Storage</h3>
                <p className="text-gray-300 mb-6">
                  Select a PDF document to upload. The document will be stored in Supabase Storage and recorded in the database with audit logging.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                <label className="block text-white font-semibold mb-4">Select PDF Document</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="block w-full text-gray-300 bg-white/10 border border-white/20 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                  accept=".pdf"
                  disabled={isProcessing}
                />

                {selectedFile && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white font-semibold">{selectedFile.name}</p>
                    <p className="text-gray-400 text-sm">Size: {formatFileSize(selectedFile.size)}</p>
                    <p className="text-gray-400 text-sm">Type: {selectedFile.type}</p>
                    {uploadedPath && (
                      <p className="text-green-400 text-sm mt-2">✅ Uploaded & Recorded: {uploadedPath}</p>
                    )}
                    {currentDocumentId && (
                      <p className="text-blue-400 text-sm">📊 Database ID: {currentDocumentId}</p>
                    )}
                  </div>
                )}

                {isProcessing && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-2"></div>
                      <span className="text-purple-300">Uploading & Recording in Database...</span>
                    </div>
                  </div>
                )}
              </div>

              {previewUrl && (
                <button
                  onClick={handleDocumentPreview}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold"
                >
                  Continue to Preview & Log
                </button>
              )}
            </div>
          )}

          {/* Step 2: Preview Document */}
          {currentStep === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Step 2: Preview Document with Audit Logging</h3>
                <p className="text-gray-300 mb-6">
                  Review your uploaded document. This preview action will be logged in the audit trail.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Document Preview</h4>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30 text-sm"
                  >
                    Open in New Tab
                  </a>
                </div>

                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <iframe
                    src={previewUrl}
                    className="w-full h-96 rounded-lg"
                    title="Document Preview"
                  />
                </div>

                <div className="mt-4 text-sm text-gray-400">
                  <p>Document URL: <span className="font-mono text-xs">{previewUrl}</span></p>
                  <p>Storage Path: <span className="font-mono text-xs">{uploadedPath}</span></p>
                  <p>Database ID: <span className="font-mono text-xs">{currentDocumentId}</span></p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg border border-white/10 p-6 space-y-4">
                <h4 className="text-lg font-semibold text-white">Document Metadata</h4>

                <div>
                  <label className="block text-white font-semibold mb-2">Title</label>
                  <input
                    type="text"
                    value={documentMetadata.title}
                    onChange={(e) => setDocumentMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Document title"
                    className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Purpose</label>
                  <textarea
                    value={documentMetadata.purpose}
                    onChange={(e) => setDocumentMetadata(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Purpose of this document"
                    className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">Signer Name</label>
                  <input
                    type="text"
                    value={documentMetadata.signerInfo}
                    onChange={(e) => setDocumentMetadata(prev => ({ ...prev, signerInfo: e.target.value }))}
                    placeholder="Your name for the signature"
                    className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={handleDocumentPreview}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold"
              >
                Continue to Accept Document
              </button>
            </div>
          )}

          {/* Step 3: Read & Accept */}
          {currentStep === 'accept' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Step 3: Accept Document with Audit Trail</h3>
                <p className="text-gray-300 mb-6">
                  Confirm acceptance of the document. This action will be recorded in the audit logs and trigger the signing process.
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">⚠️</span>
                  <h4 className="text-xl font-bold text-yellow-300">Audit & Compliance Notice</h4>
                </div>
                <div className="space-y-2 text-yellow-200">
                  <p>• Your acceptance will be logged with timestamp and user details</p>
                  <p>• Digital signature will be cryptographically secured and auditable</p>
                  <p>• All actions are recorded for compliance and verification</p>
                  <p>• Signed document will be stored with complete audit trail</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Signature & Audit Details</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <span className="font-semibold">Signer ID:</span> {wallet.customId}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold">Signer Name:</span> {documentMetadata.signerInfo || wallet.customId}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold">Document ID:</span> {currentDocumentId}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold">Timestamp:</span> {new Date().toLocaleString()}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-semibold">Document:</span> {selectedFile?.name}
                  </p>
                </div>
              </div>

              <button
                onClick={handleDocumentAccept}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-4 rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isProcessing ? 'Processing & Recording...' : 'I Accept and Agree to Sign'}
              </button>

              {isProcessing && (
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-2"></div>
                    <span className="text-purple-300">Recording acceptance & inserting signature...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Step 4: Document Signed & Recorded</h3>
                <p className="text-gray-300 mb-6">
                  Your document has been successfully signed, stored, and recorded in the database with complete audit trail.
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">✅</span>
                  <h4 className="text-xl font-bold text-green-300">Complete Audit Trail Created</h4>
                </div>
                <div className="space-y-2 text-green-200">
                  <p>• Document uploaded and recorded in database</p>
                  <p>• Preview action logged with timestamp</p>
                  <p>• Acceptance recorded with user details</p>
                  <p>• Signature inserted using sign_insert logic</p>
                  <p>• Signed document stored with new hash</p>
                  <p>��� Complete audit trail maintained for compliance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Database Record</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="font-semibold">Document ID:</span>
                      <span className="font-mono text-xs ml-2">{currentDocumentId}</span>
                    </p>
                    <p className="text-gray-300">
                      <span className="font-semibold">Original Hash:</span>
                      <span className="font-mono text-xs ml-2 break-all">{documentHash}</span>
                    </p>
                    <p className="text-gray-300">
                      <span className="font-semibold">Status:</span>
                      <span className="text-green-400 ml-2">Signed</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Signature Record</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="font-semibold">Signed Hash:</span>
                      <span className="font-mono text-xs ml-2 break-all">{signedDocumentHash}</span>
                    </p>
                    <p className="text-gray-300">
                      <span className="font-semibold">Signature:</span>
                      <span className="font-mono text-xs ml-2 break-all">{signature.slice(0, 30)}...</span>
                    </p>
                    <p className="text-gray-300">
                      <span className="font-semibold">Audit:</span>
                      <span className="text-green-400 ml-2">Complete</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    const latestDoc = signedDocuments[signedDocuments.length - 1];
                    if (latestDoc?.signed_public_url) {
                      window.open(latestDoc.signed_public_url, '_blank');
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-semibold"
                >
                  View Signed Document
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

        {/* Signed Documents List from Database */}
        {signedDocuments.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 mt-8">
            <h3 className="text-xl font-bold text-white mb-6">Signed Documents (Database Records)</h3>
            <div className="space-y-4">
              {signedDocuments.map((doc) => (
                <div key={doc.id} className="bg-white/5 rounded-lg border border-white/10 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">
                        {doc.metadata?.title || doc.file_name}
                      </h4>
                      <p className="text-gray-400 text-sm">Signed: {formatDate(doc.updated_at!)}</p>
                      {doc.metadata?.purpose && (
                        <p className="text-gray-300 text-sm mt-1">{doc.metadata.purpose}</p>
                      )}
                      <p className="text-blue-400 text-sm">DB ID: {doc.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Size: {formatFileSize(doc.file_size)}</p>
                      <p className={`text-sm ${doc.status === 'signed' ? 'text-green-400' :
                        doc.status === 'uploaded' ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                        📊 {doc.status?.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    {doc.public_url && (
                      <a
                        href={doc.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-500/20 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-500/30 transition-all duration-200 border border-gray-500/30 text-sm"
                      >
                        📄 Original
                      </a>
                    )}
                    {doc.signed_public_url && (
                      <a
                        href={doc.signed_public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg hover:bg-green-500/30 transition-all duration-200 border border-green-500/30 text-sm"
                      >
                        ✅ Signed Version
                      </a>
                    )}
                    <button className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30 text-sm">
                      📊 Audit Trail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
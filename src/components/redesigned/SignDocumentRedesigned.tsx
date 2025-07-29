'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
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
      setDocumentMetadata(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ''),
        signerInfo: wallet?.customId || ''
      }));
    }
  };

  const handleSignDocument = async () => {
    if (!selectedFile || !wallet) return;

    setIsProcessing(true);
    setSigningResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('custom_id', wallet.customId);
      formData.append('wallet_address', wallet.address);
      formData.append('private_key', wallet.privateKey);
      formData.append('metadata', JSON.stringify(documentMetadata));

      const response = await fetch('/api/documents/sign', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to sign document');
      }

      const result = await response.json();
      setSigningResult({
        success: true,
        documentId: result.documentId,
        signedUrl: result.signedUrl
      });

    } catch (error) {
      console.error('Error signing document:', error);
      setSigningResult({
        success: false,
        error: error instanceof Error ? error.message : 'Signing failed'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPath="/sign-document"
        userInfo={wallet ? {
          customId: wallet.customId,
          address: wallet.address,
          securityLevel: 'enhanced'
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
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <SecurityIcons.Signature className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Sign Document</h1>
                    <p className="text-neutral-400">Secure digital document signing with blockchain verification</p>
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

          {/* Upload Section */}
          <Card variant="glass" padding="lg" className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">Upload Document to Sign</h2>

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
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            )}
          </Card>

          {/* Document Metadata */}
          {selectedFile && (
            <Card variant="glass" padding="lg" className="mb-8">
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
            </Card>
          )}

          {/* Sign Button */}
          {selectedFile && (
            <Card variant="glass" padding="lg" className="mb-8">
              <Button
                onClick={handleSignDocument}
                disabled={isProcessing || !documentMetadata.title.trim()}
                loading={isProcessing}
                fullWidth
                size="lg"
                icon={<SecurityIcons.Signature className="w-5 h-5" />}
              >
                {isProcessing ? 'Signing Document...' : 'Sign Document'}
              </Button>
            </Card>
          )}

          {/* Signing Results */}
          {signingResult && (
            <Card variant="glass" padding="lg" className="mb-8">
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
    </div>
  );
};

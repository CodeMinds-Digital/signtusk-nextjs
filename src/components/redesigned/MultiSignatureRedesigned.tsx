'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';

interface Signer {
  id: string;
  customId: string;
  status: 'pending' | 'signed' | 'rejected';
  signature?: string;
  signedAt?: string;
}

interface MultiSignDocument {
  id: string;
  fileName: string;
  documentHash: string;
  initiatorId: string;
  requiredSigners: number;
  signers: Signer[];
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  completedAt?: string;
  description?: string;
}

export const MultiSignatureRedesigned: React.FC = () => {
  const { wallet } = useWallet();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add tab-based navigation like old implementation
  const [activeTab, setActiveTab] = useState<'initiate' | 'pending' | 'history'>('initiate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [signerIds, setSignerIds] = useState<string[]>(['']);
  const [description, setDescription] = useState('');
  const [multiSignDocuments, setMultiSignDocuments] = useState<MultiSignDocument[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState<MultiSignDocument[]>([]);
  const [creationResult, setCreationResult] = useState<{ success: boolean; error?: string } | null>(null);

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
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const addSignerField = () => {
    setSignerIds([...signerIds, '']);
  };

  const removeSignerField = (index: number) => {
    if (signerIds.length > 1) {
      setSignerIds(signerIds.filter((_, i) => i !== index));
    }
  };

  const updateSignerId = (index: number, value: string) => {
    const newSignerIds = [...signerIds];
    newSignerIds[index] = value;
    setSignerIds(newSignerIds);
  };

  const handleInitiateMultiSign = async () => {
    if (!selectedFile || !wallet) {
      alert('Please select a file and ensure you are logged in');
      return;
    }

    const validSignerIds = signerIds.filter(id => id.trim() !== '');
    if (validSignerIds.length === 0) {
      alert('Please add at least one signer ID');
      return;
    }

    setIsProcessing(true);
    setCreationResult(null);

    try {
      // Step 1: Upload document for multi-signature
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('signers', JSON.stringify(validSignerIds.map(id => id.trim().toUpperCase())));
      formData.append('description', description.trim());
      formData.append('initiator_id', wallet.customId);

      const response = await fetch('/api/documents/multi-signature/initiate', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create multi-signature request');
      }

      const result = await response.json();

      // Create multi-signature document object
      const multiSignDoc: MultiSignDocument = {
        id: result.document_id,
        fileName: selectedFile.name,
        documentHash: result.document_hash,
        initiatorId: wallet.customId,
        requiredSigners: validSignerIds.length,
        signers: validSignerIds.map(id => ({
          id: `${result.document_id}_${id}`,
          customId: id.trim().toUpperCase(),
          status: 'pending'
        })),
        status: 'pending',
        createdAt: new Date().toISOString(),
        description: description.trim()
      };

      // Add to documents list
      setMultiSignDocuments(prev => [multiSignDoc, ...prev]);

      // Add to pending signatures for other signers
      if (validSignerIds.includes(wallet.customId)) {
        setPendingSignatures(prev => [multiSignDoc, ...prev]);
      }

      setCreationResult({ success: true });

      // Reset form
      setSelectedFile(null);
      setSignerIds(['']);
      setDescription('');

    } catch (error) {
      console.error('Error creating multi-signature request:', error);
      setCreationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create multi-signature request'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignDocument = async (docId: string) => {
    if (!wallet) {
      alert('Wallet not available');
      return;
    }

    const doc = multiSignDocuments.find(d => d.id === docId) || pendingSignatures.find(d => d.id === docId);
    if (!doc) {
      alert('Document not found');
      return;
    }

    const signerIndex = doc.signers.findIndex(s => s.customId === wallet.customId);
    if (signerIndex === -1) {
      alert('You are not authorized to sign this document');
      return;
    }

    if (doc.signers[signerIndex].status === 'signed') {
      alert('You have already signed this document');
      return;
    }

    try {
      setIsProcessing(true);

      // Call API to sign the multi-signature document
      const response = await fetch('/api/documents/multi-signature/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: docId,
          signer_id: wallet.customId,
          private_key: wallet.privateKey
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign document');
      }

      const result = await response.json();

      // Update local state with real signature data
      const updateDocuments = (docs: MultiSignDocument[]) => docs.map(d => {
        if (d.id === docId) {
          const updatedSigners = [...d.signers];
          updatedSigners[signerIndex] = {
            ...updatedSigners[signerIndex],
            status: 'signed' as const,
            signature: result.signature,
            signedAt: new Date().toISOString()
          };

          // Check if all required signatures are collected
          const signedCount = updatedSigners.filter(s => s.status === 'signed').length;
          const isCompleted = signedCount === d.requiredSigners;
          const newStatus: 'completed' | 'pending' = isCompleted ? 'completed' : 'pending';

          return {
            ...d,
            signers: updatedSigners,
            status: newStatus,
            completedAt: isCompleted ? new Date().toISOString() : undefined
          };
        }
        return d;
      });

      setMultiSignDocuments(updateDocuments);
      setPendingSignatures(updateDocuments);

      alert('Document signed successfully!');

    } catch (error) {
      console.error('Error signing document:', error);
      alert(error instanceof Error ? error.message : 'Failed to sign document');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPage="multi-signature"
        userInfo={wallet ? {
          customId: wallet.customId,
          address: wallet.address
        } : undefined}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="lg:ml-64">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <SecurityIcons.Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Multi-Signature Documents</h1>
                    <div className="flex items-center space-x-4">
                      <p className="text-neutral-400">Model 1.2: Off-Chain Multi-Signature</p>
                      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-1 rounded-lg">
                        <span className="text-white text-sm font-semibold">
                          Signer ID: {wallet?.customId}
                        </span>
                      </div>
                      <div className="text-blue-400 text-sm flex items-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                        Ready for Multi-Signature
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

          {/* Tab Navigation */}
          <Card variant="glass" padding="lg" className="mb-8">
            <div className="flex space-x-1 bg-neutral-800/50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('initiate')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'initiate'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
                  }`}
              >
                Initiate Multi-Signature
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'pending'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
                  }`}
              >
                Pending Signatures ({pendingSignatures.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'history'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
                  }`}
              >
                History ({multiSignDocuments.length})
              </button>
            </div>
          </Card>

          {/* Tab Content - Initiate Multi-Signature */}
          {activeTab === 'initiate' && (
            <Card variant="glass" padding="lg" className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-6">Create Multi-Signature Request</h2>

              {/* File Upload */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 mb-6 ${dragActive
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
                  <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <SecurityIcons.Document className="w-8 h-8 text-blue-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {dragActive ? 'Drop document here' : 'Upload Document for Multi-Signature'}
                    </h3>
                    <p className="text-neutral-400 mb-4">
                      Select the document that requires multiple signatures
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
                <Card variant="outline" padding="md" className="mb-6 border-blue-500/30 bg-blue-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <SecurityIcons.Document className="w-5 h-5 text-blue-400" />
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

              {/* Signers Configuration */}
              {selectedFile && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Document Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Brief description of the document and signing purpose"
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-neutral-300">
                        Required Signers
                      </label>
                      <Button
                        size="sm"
                        onClick={addSignerField}
                        icon={<SecurityIcons.Activity className="w-4 h-4" />}
                      >
                        Add Signer
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {signerIds.map((signerId, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={signerId}
                              onChange={(e) => updateSignerId(index, e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder={`Signer ${index + 1} ID (e.g., USER123)`}
                            />
                          </div>
                          {signerIds.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeSignerField(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-neutral-400 text-sm mt-2">
                      Enter the Custom IDs of users who need to sign this document
                    </p>
                  </div>

                  <Button
                    onClick={handleInitiateMultiSign}
                    disabled={isProcessing || signerIds.filter(id => id.trim()).length === 0}
                    loading={isProcessing}
                    fullWidth
                    size="lg"
                    icon={<SecurityIcons.Shield className="w-5 h-5" />}
                  >
                    {isProcessing ? 'Creating Multi-Signature Request...' : 'Create Multi-Signature Request'}
                  </Button>
                </div>
              )}

              {/* Creation Result */}
              {creationResult && (
                <Card variant="outline" padding="md" className={`mt-6 ${creationResult.success
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-red-500/30 bg-red-500/10'
                  }`}>
                  <div className="flex items-start space-x-3">
                    {creationResult.success ? (
                      <SecurityIcons.Verified className="w-5 h-5 text-green-400 mt-0.5" />
                    ) : (
                      <SecurityIcons.Activity className="w-5 h-5 text-red-400 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-medium mb-1 ${creationResult.success ? 'text-green-300' : 'text-red-300'
                        }`}>
                        {creationResult.success ? 'Multi-Signature Request Created!' : 'Creation Failed'}
                      </h4>
                      <p className={`text-sm ${creationResult.success ? 'text-green-200' : 'text-red-200'
                        }`}>
                        {creationResult.success
                          ? 'Signers have been notified and can now sign the document'
                          : creationResult.error || 'Failed to create multi-signature request'
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </Card>
          )}

          {/* Tab Content - Pending Signatures */}
          {activeTab === 'pending' && (
            <Card variant="glass" padding="lg" className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-6">Pending Signatures</h2>
              <p className="text-neutral-400 mb-6">
                Documents waiting for your signature or signatures from other parties.
              </p>

              {pendingSignatures.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-neutral-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <SecurityIcons.Activity className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">No Pending Signatures</h3>
                  <p className="text-neutral-400">You have no documents waiting for signatures</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSignatures.map((doc) => (
                    <Card key={doc.id} variant="outline" padding="md">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">{doc.fileName}</h3>
                          <p className="text-neutral-400 text-sm mb-2">{doc.description}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-neutral-300">
                              Initiated by: {doc.initiatorId}
                            </span>
                            <span className="text-neutral-300">
                              Required: {doc.requiredSigners} signatures
                            </span>
                            <span className="text-neutral-300">
                              Signed: {doc.signers.filter(s => s.status === 'signed').length}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleSignDocument(doc.id)}
                            size="sm"
                            icon={<SecurityIcons.Signature className="w-4 h-4" />}
                          >
                            Sign
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Tab Content - History */}
          {activeTab === 'history' && (
            <Card variant="glass" padding="lg">
              <h2 className="text-xl font-semibold text-white mb-6">Multi-Signature Documents</h2>

              {multiSignDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-neutral-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <SecurityIcons.Document className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">No Multi-Signature Documents</h3>
                  <p className="text-neutral-400">Create your first multi-signature request above</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {multiSignDocuments.map((doc) => (
                    <Card key={doc.id} variant="outline" padding="md" className="border-neutral-600">
                      <div className="space-y-4">
                        {/* Document Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${doc.status === 'completed' ? 'bg-green-500/20' :
                              doc.status === 'rejected' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                              }`}>
                              {doc.status === 'completed' ? (
                                <SecurityIcons.Verified className="w-6 h-6 text-green-400" />
                              ) : doc.status === 'rejected' ? (
                                <SecurityIcons.Activity className="w-6 h-6 text-red-400" />
                              ) : (
                                <SecurityIcons.Document className="w-6 h-6 text-yellow-400" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">{doc.fileName}</h3>
                              <p className="text-neutral-400 text-sm">
                                Initiated by {doc.initiatorId} • {formatDate(doc.createdAt)}
                              </p>
                              {doc.description && (
                                <p className="text-neutral-300 text-sm mt-1">{doc.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${doc.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              doc.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                              }`}>
                              {doc.status === 'completed' ? 'Completed' :
                                doc.status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                            <p className="text-neutral-400 text-xs mt-1">
                              {doc.signers.filter(s => s.status === 'signed').length}/{doc.requiredSigners} signed
                            </p>
                          </div>
                        </div>

                        {/* Signers List */}
                        <div>
                          <h4 className="text-white font-medium mb-3">Signers</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {doc.signers.map((signer) => (
                              <div key={signer.id} className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-600">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white font-medium">{signer.customId}</p>
                                    {signer.signedAt && (
                                      <p className="text-neutral-400 text-xs">{formatDate(signer.signedAt)}</p>
                                    )}
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs ${signer.status === 'signed' ? 'bg-green-500/20 text-green-300' :
                                    signer.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                                    }`}>
                                    {signer.status === 'signed' ? '✅ Signed' :
                                      signer.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3 pt-4 border-t border-neutral-600">
                          {wallet && doc.signers.some(s => s.customId === wallet.customId && s.status === 'pending') && (
                            <Button
                              onClick={() => handleSignDocument(doc.id)}
                              icon={<SecurityIcons.Signature className="w-4 h-4" />}
                            >
                              Sign Document
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => {
                              // In real app, this would download or view the document
                              alert(`Document Hash: ${doc.documentHash}`);
                            }}
                            icon={<SecurityIcons.Document className="w-4 h-4" />}
                          >
                            View Document
                          </Button>
                          {doc.status === 'completed' && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                // In real app, this would download the signed document
                                alert('Downloading completed multi-signature document...');
                              }}
                              icon={<SecurityIcons.Verified className="w-4 h-4" />}
                            >
                              Download Signed
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Information Section */}
          <Card variant="glass" padding="lg" className="mt-8">
            <h3 className="text-xl font-semibold text-white mb-6">About Multi-Signature Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <SecurityIcons.Shield className="w-5 h-5 text-blue-400" />
                  <span>Collaborative Signing</span>
                </h4>
                <ul className="space-y-2 text-neutral-300">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Multiple parties can sign the same document</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Real-time signature status tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Automatic completion when all parties sign</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Blockchain verification for all signatures</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <SecurityIcons.Verified className="w-5 h-5 text-green-400" />
                  <span>Security & Trust</span>
                </h4>
                <ul className="space-y-2 text-neutral-300">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Each signature is cryptographically unique</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Document integrity maintained throughout</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Audit trail for all signing activities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Legal compliance and non-repudiation</span>
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

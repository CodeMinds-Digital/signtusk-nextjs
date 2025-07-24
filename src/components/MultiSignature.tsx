'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { signDocument, verifySignature } from '@/lib/signing';
import { generateDocumentHash } from '@/lib/document';

interface Signer {
  id: string;
  address: string;
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
  initiatorAddress: string;
  requiredSigners: number;
  signers: Signer[];
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  completedAt?: string;
  fileSize: number;
  fileType: string;
  description?: string;
}

export default function MultiSignature() {
  const { wallet } = useWallet();
  const [activeTab, setActiveTab] = useState<'initiate' | 'pending' | 'history'>('initiate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signerIds, setSignerIds] = useState<string[]>(['']);
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [multiSignDocuments, setMultiSignDocuments] = useState<MultiSignDocument[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState<MultiSignDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Model 1.2: Multi-Signature Document Signing
  const handleInitiateMultiSign = async () => {
    if (!selectedFile || !wallet) {
      alert('Please select a file and ensure you are logged in');
      return;
    }

    const validSignerIds = signerIds.filter(id => id.trim() !== '');
    if (validSignerIds.length === 0) {
      alert('Please add at least one signer');
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1: Generate Document Hash
      const documentHash = await generateDocumentHash(selectedFile);

      // Step 2: Create Multi-Signature Request
      const multiSignDoc: MultiSignDocument = {
        id: Date.now().toString(),
        fileName: selectedFile.name,
        documentHash,
        initiatorId: wallet!.customId,
        initiatorAddress: wallet!.address,
        requiredSigners: validSignerIds.length,
        signers: validSignerIds.map(id => ({
          id: Date.now().toString() + Math.random(),
          address: '', // In a real app, this would be resolved from the signer ID
          customId: id.trim().toUpperCase(),
          status: 'pending'
        })),
        status: 'pending',
        createdAt: new Date().toISOString(),
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        description: description.trim()
      };

      // Store in local storage (in production, this would be stored in a database and notifications sent)
      const existingDocs = JSON.parse(localStorage.getItem('multiSignDocuments') || '[]');
      existingDocs.push(multiSignDoc);
      localStorage.setItem('multiSignDocuments', JSON.stringify(existingDocs));

      // Also add to pending signatures for other users (simulation)
      const pendingDocs = JSON.parse(localStorage.getItem('pendingSignatures') || '[]');
      pendingDocs.push(multiSignDoc);
      localStorage.setItem('pendingSignatures', JSON.stringify(pendingDocs));

      setMultiSignDocuments(existingDocs);
      setSelectedFile(null);
      setSignerIds(['']);
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert('Multi-signature request initiated successfully!');
    } catch (error) {
      console.error('Error initiating multi-signature:', error);
      alert('Failed to initiate multi-signature request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignDocument = async (docId: string) => {
    if (!wallet) return;

    setIsProcessing(true);
    try {
      const pendingDocs = JSON.parse(localStorage.getItem('pendingSignatures') || '[]');
      const docIndex = pendingDocs.findIndex((doc: MultiSignDocument) => doc.id === docId);

      if (docIndex === -1) {
        alert('Document not found');
        return;
      }

      const doc = pendingDocs[docIndex];

      // Check if current user is a required signer
      const signerIndex = doc.signers.findIndex((signer: Signer) => signer.customId === wallet!.customId);
      if (signerIndex === -1) {
        alert('You are not authorized to sign this document');
        return;
      }

      if (doc.signers[signerIndex].status === 'signed') {
        alert('You have already signed this document');
        return;
      }

      // Sign the document hash
      const signature = await signDocument(doc.documentHash, wallet!.privateKey);

      // Update signer status
      doc.signers[signerIndex] = {
        ...doc.signers[signerIndex],
        status: 'signed',
        signature,
        signedAt: new Date().toISOString()
      };

      // Check if all required signatures are collected
      const signedCount = doc.signers.filter((signer: Signer) => signer.status === 'signed').length;
      if (signedCount === doc.requiredSigners) {
        doc.status = 'completed';
        doc.completedAt = new Date().toISOString();
      }

      // Update storage
      pendingDocs[docIndex] = doc;
      localStorage.setItem('pendingSignatures', JSON.stringify(pendingDocs));

      // Also update the main documents list
      const allDocs = JSON.parse(localStorage.getItem('multiSignDocuments') || '[]');
      const mainDocIndex = allDocs.findIndex((d: MultiSignDocument) => d.id === docId);
      if (mainDocIndex !== -1) {
        allDocs[mainDocIndex] = doc;
        localStorage.setItem('multiSignDocuments', JSON.stringify(allDocs));
      }

      setPendingSignatures(pendingDocs);
      setMultiSignDocuments(allDocs);

      alert('Document signed successfully!');
    } catch (error) {
      console.error('Error signing document:', error);
      alert('Failed to sign document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDocument = async (docId: string) => {
    if (!wallet) return;

    const pendingDocs = JSON.parse(localStorage.getItem('pendingSignatures') || '[]');
    const docIndex = pendingDocs.findIndex((doc: MultiSignDocument) => doc.id === docId);

    if (docIndex === -1) return;

    const doc = pendingDocs[docIndex];
    const signerIndex = doc.signers.findIndex((signer: Signer) => signer.customId === wallet!.customId);

    if (signerIndex === -1) return;

    // Update signer status
    doc.signers[signerIndex].status = 'rejected';
    doc.status = 'rejected';

    // Update storage
    pendingDocs[docIndex] = doc;
    localStorage.setItem('pendingSignatures', JSON.stringify(pendingDocs));

    setPendingSignatures(pendingDocs);
    alert('Document signing request rejected');
  };

  const addSignerField = () => {
    setSignerIds([...signerIds, '']);
  };

  const removeSignerField = (index: number) => {
    const newSignerIds = signerIds.filter((_, i) => i !== index);
    setSignerIds(newSignerIds.length === 0 ? [''] : newSignerIds);
  };

  const updateSignerId = (index: number, value: string) => {
    const newSignerIds = [...signerIds];
    newSignerIds[index] = value;
    setSignerIds(newSignerIds);
  };

  const loadDocuments = () => {
    const docs = JSON.parse(localStorage.getItem('multiSignDocuments') || '[]');
    const pending = JSON.parse(localStorage.getItem('pendingSignatures') || '[]');

    // Filter pending documents for current user
    const userPending = pending.filter((doc: MultiSignDocument) =>
      doc.signers.some((signer: Signer) =>
        signer.customId === wallet?.customId && signer.status === 'pending'
      )
    );

    setMultiSignDocuments(docs);
    setPendingSignatures(userPending);
  };

  React.useEffect(() => {
    if (wallet) {
      loadDocuments();
    }
  }, [wallet]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'signed': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'completed': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'signed': return '✅';
      case 'rejected': return '❌';
      case 'completed': return '🎉';
      default: return '❓';
    }
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please login to access multi-signature features.</p>
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
              <h1 className="text-3xl font-bold text-white mb-2">Multi-Signature Documents</h1>
              <p className="text-gray-300">Model 1.2: Off-Chain Multi-Signature</p>
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
              onClick={() => setActiveTab('initiate')}
              className={`px-6 py-4 font-semibold transition-all duration-200 ${activeTab === 'initiate'
                ? 'text-white border-b-2 border-purple-500 bg-white/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Initiate Multi-Sign
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 font-semibold transition-all duration-200 relative ${activeTab === 'pending'
                ? 'text-white border-b-2 border-purple-500 bg-white/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Pending Signatures
              {pendingSignatures.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingSignatures.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-4 font-semibold transition-all duration-200 ${activeTab === 'history'
                ? 'text-white border-b-2 border-purple-500 bg-white/5'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              History
            </button>
          </div>

          <div className="p-6">
            {/* Initiate Multi-Sign Tab */}
            {activeTab === 'initiate' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Initiate Multi-Signature Request</h3>
                  <p className="text-gray-300 mb-6">
                    Upload a document and specify the signers required to approve it. Each signer will need to provide their digital signature.
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg border border-white/10 p-6 space-y-6">
                  {/* Document Upload */}
                  <div>
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

                  {/* Description */}
                  <div>
                    <label className="block text-white font-semibold mb-4">Description (Optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the purpose of this document or any special instructions for signers..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Signers */}
                  <div>
                    <label className="block text-white font-semibold mb-4">Required Signers</label>
                    <div className="space-y-3">
                      {signerIds.map((signerId, index) => (
                        <div key={index} className="flex space-x-3">
                          <input
                            type="text"
                            value={signerId}
                            onChange={(e) => updateSignerId(index, e.target.value.toUpperCase())}
                            placeholder="Enter Signer ID (e.g., ABC1234DEFG5678)"
                            maxLength={15}
                            className="flex-1 bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                          />
                          {signerIds.length > 1 && (
                            <button
                              onClick={() => removeSignerField(index)}
                              className="bg-red-500/20 text-red-300 px-4 py-3 rounded-lg hover:bg-red-500/30 transition-all duration-200 border border-red-500/30"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addSignerField}
                        className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-all duration-200 border border-blue-500/30"
                      >
                        + Add Another Signer
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleInitiateMultiSign}
                  disabled={!selectedFile || isProcessing || signerIds.every(id => id.trim() === '')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isProcessing ? 'Initiating Multi-Signature...' : 'Initiate Multi-Signature Request'}
                </button>
              </div>
            )}

            {/* Pending Signatures Tab */}
            {activeTab === 'pending' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Pending Signature Requests</h3>
                  <p className="text-gray-300 mb-6">
                    Documents waiting for your signature. Review and sign or reject each request.
                  </p>
                </div>

                {pendingSignatures.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-6xl mb-4">📋</div>
                    <h4 className="text-xl font-bold text-white mb-2">No Pending Signatures</h4>
                    <p className="text-gray-400">You have no documents waiting for your signature.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingSignatures.map((doc) => (
                      <div key={doc.id} className="bg-white/5 rounded-lg border border-white/10 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-white">{doc.fileName}</h4>
                            <p className="text-gray-400 text-sm">Initiated by: {doc.initiatorId}</p>
                            <p className="text-gray-400 text-sm">Created: {formatDate(doc.createdAt)}</p>
                            {doc.description && (
                              <p className="text-gray-300 text-sm mt-2 italic">{doc.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm">Size: {formatFileSize(doc.fileSize)}</p>
                            <p className="text-gray-400 text-sm">Type: {doc.fileType}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h5 className="text-white font-semibold mb-2">Signers ({doc.signers.filter(s => s.status === 'signed').length}/{doc.requiredSigners})</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {doc.signers.map((signer: Signer) => (
                              <div key={signer.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                                <span className="text-gray-300 font-mono text-sm">{signer.customId}</span>
                                <span className={`text-sm ${getStatusColor(signer.status)}`}>
                                  {getStatusIcon(signer.status)} {signer.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleSignDocument(doc.id)}
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                          >
                            {isProcessing ? 'Signing...' : 'Sign Document'}
                          </button>
                          <button
                            onClick={() => handleRejectDocument(doc.id)}
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Multi-Signature History</h3>
                  <p className="text-gray-300 mb-6">
                    View all multi-signature documents you have initiated or participated in.
                  </p>
                </div>

                {multiSignDocuments.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-6xl mb-4">📚</div>
                    <h4 className="text-xl font-bold text-white mb-2">No Multi-Signature Documents</h4>
                    <p className="text-gray-400">Start by initiating a multi-signature request.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {multiSignDocuments.map((doc) => (
                      <div key={doc.id} className="bg-white/5 rounded-lg border border-white/10 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-white">{doc.fileName}</h4>
                            <p className="text-gray-400 text-sm">Initiated: {formatDate(doc.createdAt)}</p>
                            {doc.completedAt && (
                              <p className="text-gray-400 text-sm">Completed: {formatDate(doc.completedAt)}</p>
                            )}
                            {doc.description && (
                              <p className="text-gray-300 text-sm mt-2 italic">{doc.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(doc.status)}`}>
                              {getStatusIcon(doc.status)} {doc.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h5 className="text-white font-semibold mb-2">Signers ({doc.signers.filter(s => s.status === 'signed').length}/{doc.requiredSigners})</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {doc.signers.map((signer: Signer) => (
                              <div key={signer.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                                <span className="text-gray-300 font-mono text-sm">{signer.customId}</span>
                                <div className="text-right">
                                  <span className={`text-sm ${getStatusColor(signer.status)}`}>
                                    {getStatusIcon(signer.status)} {signer.status}
                                  </span>
                                  {signer.signedAt && (
                                    <p className="text-xs text-gray-500">{formatDate(signer.signedAt)}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="text-sm text-gray-400">
                          <p>Document Hash: <span className="font-mono text-xs">{doc.documentHash}</span></p>
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
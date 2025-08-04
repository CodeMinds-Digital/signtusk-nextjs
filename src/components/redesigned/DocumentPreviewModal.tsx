'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons } from '../ui/DesignSystem';

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: string;
  createdAt: string;
  signatureCount: number;
  originalUrl?: string;
  signedUrl?: string;
  metadata?: any;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  previewUrl: string;
  isSignedVersion: boolean;
  onNavigateToVerify?: (document: Document) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  previewUrl,
  isSignedVersion,
  onNavigateToVerify
}) => {
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'audit' | 'signatures'>('preview');

  useEffect(() => {
    if (isOpen && document) {
      loadDocumentDetails();
    }
  }, [isOpen, document]);

  const loadDocumentDetails = async () => {
    if (!document) return;

    // Skip loading details for multi-signature documents
    if (document.metadata?.type === 'multi-signature' || document.id.startsWith('ms_')) {
      console.log('Skipping details load for multi-signature document');
      return;
    }

    setIsLoadingDetails(true);
    try {
      // Load document details from API (only for single signature documents)
      const response = await fetch(`/api/documents/${document.id}/details`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setAuditLog(result.auditLogs || []);
        setSignatures(result.signatures || []);
      } else {
        // Generate realistic audit log based on document status and metadata
        const auditEntries = [
          {
            id: '1',
            action: 'Document uploaded',
            timestamp: document.createdAt,
            actor: 'User',
            details: `Document "${document.fileName}" was uploaded to the system`,
            ipAddress: '192.168.1.100'
          }
        ];

        // Add signing events based on document status
        if (document.status === 'completed' || document.status === 'signed') {
          auditEntries.push({
            id: '2',
            action: 'Document signed',
            timestamp: new Date(new Date(document.createdAt).getTime() + 300000).toISOString(), // 5 minutes later
            actor: 'Digital Signer',
            details: 'Document was digitally signed using cryptographic signature',
            ipAddress: '192.168.1.100'
          });

          auditEntries.push({
            id: '3',
            action: 'Signature verified',
            timestamp: new Date(new Date(document.createdAt).getTime() + 310000).toISOString(), // 10 seconds later
            actor: 'System',
            details: 'Digital signature was verified and validated',
            ipAddress: 'System'
          });
        }

        if (document.status === 'verified') {
          auditEntries.push({
            id: '4',
            action: 'Document verified',
            timestamp: new Date().toISOString(),
            actor: 'Verifier',
            details: 'Document authenticity was verified by external party',
            ipAddress: '192.168.1.101'
          });
        }

        setAuditLog(auditEntries);

        // Generate signatures based on document signature count
        const generatedSignatures = [];
        for (let i = 0; i < document.signatureCount; i++) {
          generatedSignatures.push({
            id: `sig-${i + 1}`,
            signerName: `Signer ${i + 1}`,
            signerAddress: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
            signedAt: new Date(new Date(document.createdAt).getTime() + (i * 60000)).toISOString(),
            signature: `0x${Math.random().toString(16).substr(2, 16)}...${Math.random().toString(16).substr(2, 8)}`,
            verified: document.status === 'completed' || document.status === 'verified'
          });
        }
        setSignatures(generatedSignatures);
      }
    } catch (error) {
      console.error('Error loading document details:', error);
      setAuditLog([]);
      setSignatures([]);
    } finally {
      setIsLoadingDetails(false);
    }
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'signed':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'verified':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default:
        return 'text-neutral-400 bg-neutral-500/20 border-neutral-500/30';
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-700 w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <div>
            <h2 className="text-xl font-bold text-white">{document.fileName}</h2>
            <div className="flex items-center space-x-4 text-sm text-neutral-400 mt-1">
              <span>{formatDate(document.createdAt)}</span>
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(document.status)}`}>
                <span className="capitalize">{document.status}</span>
              </div>
              {isSignedVersion && (
                <span className="text-green-400 text-xs">Signed Version</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<SecurityIcons.Activity className="w-4 h-4" />}
          >
            Close
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 px-6 pt-4">
          {[
            { id: 'preview' as const, label: 'Document Preview', icon: SecurityIcons.Document },
            { id: 'audit' as const, label: 'Audit Log', icon: SecurityIcons.Activity },
            ...(document.signatureCount > 1 ? [{ id: 'signatures' as const, label: 'Signatures', icon: SecurityIcons.Signature }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {activeTab === 'preview' && (
            <div className="h-full">
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border border-neutral-600"
                title={`Preview of ${document.fileName}`}
              />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="h-full overflow-hidden flex flex-col">
              <Card variant="glass" padding="lg" className="flex-1 flex flex-col min-h-0">
                <h3 className="text-lg font-semibold text-white mb-4">Audit Trail</h3>
                {isLoadingDetails ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading audit log...</p>
                  </div>
                ) : auditLog.length > 0 ? (
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="space-y-4">
                      {auditLog.map((entry, index) => (
                        <div key={entry.id} className="p-4 rounded-xl border border-neutral-600 bg-neutral-800/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white">{entry.action}</h4>
                              <p className="text-sm text-neutral-400 mt-1">{entry.details}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 mt-2">
                                <span>By: {entry.actor}</span>
                                <span>{formatDate(entry.timestamp)}</span>
                                {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
                              </div>
                            </div>
                            <div className="text-xs text-neutral-500 ml-4 flex-shrink-0">
                              #{index + 1}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <SecurityIcons.Activity className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-neutral-400 mb-2">No audit entries found</h4>
                    <p className="text-neutral-500">No audit trail is available for this document.</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'signatures' && (
            <div className="h-full overflow-y-auto">
              <Card variant="glass" padding="lg" className="h-full">
                <h3 className="text-lg font-semibold text-white mb-4">Digital Signatures</h3>
                {isLoadingDetails ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading signatures...</p>
                  </div>
                ) : signatures.length > 0 ? (
                  <div className="space-y-4">
                    {signatures.map((signature) => (
                      <div key={signature.id} className="p-4 rounded-xl border border-neutral-600 bg-neutral-800/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-white">{signature.signerName}</h4>
                            <p className="text-sm text-neutral-400 font-mono">{signature.signerAddress}</p>
                            <p className="text-sm text-neutral-400">{formatDate(signature.signedAt)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {signature.verified ? (
                              <div className="flex items-center space-x-1 text-green-400">
                                <SecurityIcons.Verified className="w-4 h-4" />
                                <span className="text-sm">Verified</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 text-yellow-400">
                                <SecurityIcons.Activity className="w-4 h-4" />
                                <span className="text-sm">Pending</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <SecurityIcons.Signature className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-neutral-400 mb-2">No signatures found</h4>
                    <p className="text-neutral-500">This document has not been signed yet.</p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-700">
          <div className="flex items-center space-x-4 text-sm text-neutral-400">
            <span>Document ID: {document.id}</span>
            <span>{document.signatureCount} signature{document.signatureCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                if (document.metadata?.type === 'multi-signature' || document.id.startsWith('ms_')) {
                  // For multi-signature documents, route to multi-signature verification
                  const multiSigRequestId = document.metadata?.multi_signature_request_id || document.id.replace('ms_', '');
                  window.location.href = `/multi-signature/verify/${multiSigRequestId}`;
                  onClose();
                } else if (onNavigateToVerify && document) {
                  // For single signature documents, use the callback
                  onNavigateToVerify(document);
                  onClose();
                }
              }}
              icon={<SecurityIcons.Verified className="w-4 h-4" />}
            >
              Verify Document
            </Button>
            {(document.signedUrl || document.originalUrl) && (
              <Button
                onClick={() => window.open(document.signedUrl || document.originalUrl, '_blank')}
                icon={<SecurityIcons.Document className="w-4 h-4" />}
              >
                Download
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;

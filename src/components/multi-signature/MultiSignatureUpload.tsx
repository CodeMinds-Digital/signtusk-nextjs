'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';

interface Signer {
  id: string;
  customId: string;
  order: number;
}

interface UploadResult {
  success: boolean;
  message: string;
  multiSignatureRequest?: any;
  document?: any;
  error?: string;
}

interface MultiSignatureUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  onCancel?: () => void;
}

export const MultiSignatureUpload: React.FC<MultiSignatureUploadProps> = ({
  onUploadComplete,
  onCancel
}) => {
  const { wallet } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [signers, setSigners] = useState<Signer[]>([
    { id: '1', customId: '', order: 0 }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Check for pending document from Sign Document page
  useEffect(() => {
    const pendingDoc = sessionStorage.getItem('pendingMultiSigDocument');
    if (pendingDoc) {
      try {
        const docData = JSON.parse(pendingDoc);

        // Convert base64 back to File
        const byteCharacters = atob(docData.fileData.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new File([byteArray], docData.fileName, { type: docData.fileType });

        setSelectedFile(file);
        setDescription(docData.metadata?.purpose || '');

        // Clear the pending document
        sessionStorage.removeItem('pendingMultiSigDocument');
      } catch (error) {
        console.error('Error loading pending document:', error);
      }
    }
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const addSigner = () => {
    const newSigner: Signer = {
      id: Date.now().toString(),
      customId: '',
      order: signers.length
    };
    setSigners([...signers, newSigner]);
  };

  const removeSigner = (id: string) => {
    if (signers.length <= 1) return;
    const updatedSigners = signers
      .filter(signer => signer.id !== id)
      .map((signer, index) => ({ ...signer, order: index }));
    setSigners(updatedSigners);
  };

  const updateSignerCustomId = (id: string, customId: string) => {
    setSigners(signers.map(signer =>
      signer.id === id ? { ...signer, customId: customId.toUpperCase() } : signer
    ));
  };

  const moveSignerUp = (id: string) => {
    const index = signers.findIndex(s => s.id === id);
    if (index <= 0) return;

    const newSigners = [...signers];
    [newSigners[index], newSigners[index - 1]] = [newSigners[index - 1], newSigners[index]];
    newSigners.forEach((signer, idx) => signer.order = idx);
    setSigners(newSigners);
  };

  const moveSignerDown = (id: string) => {
    const index = signers.findIndex(s => s.id === id);
    if (index >= signers.length - 1) return;

    const newSigners = [...signers];
    [newSigners[index], newSigners[index + 1]] = [newSigners[index + 1], newSigners[index]];
    newSigners.forEach((signer, idx) => signer.order = idx);
    setSigners(newSigners);
  };

  const validateForm = () => {
    if (!selectedFile) {
      alert('Please select a document to upload');
      return false;
    }

    const validSigners = signers.filter(s => s.customId.trim() !== '');
    if (validSigners.length === 0) {
      alert('Please add at least one signer');
      return false;
    }

    // Check for duplicate signers
    const customIds = validSigners.map(s => s.customId.trim().toUpperCase());
    const uniqueIds = new Set(customIds);
    if (customIds.length !== uniqueIds.size) {
      alert('Duplicate signer IDs are not allowed');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !wallet) return;

    setIsProcessing(true);
    setUploadResult(null);

    try {
      const validSigners = signers
        .filter(s => s.customId.trim() !== '')
        .map((signer, index) => ({
          customId: signer.customId.trim().toUpperCase(),
          order: index
        }));

      const formData = new FormData();
      formData.append('file', selectedFile!);
      formData.append('signers', JSON.stringify(validSigners));
      formData.append('description', description.trim());

      const response = await fetch('/api/multi-signature/create', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult(result);
        onUploadComplete?.(result);
      } else {
        setUploadResult({
          success: false,
          message: result.error || 'Failed to create multi-signature request',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: 'Network error occurred',
        error: 'network_error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Document Upload */}
      <Card variant="glass" padding="lg">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <SecurityIcons.Document className="w-6 h-6 mr-3 text-primary-400" />
          Upload Document
        </h3>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${dragActive
            ? 'border-primary-400 bg-primary-500/10'
            : selectedFile
              ? 'border-green-400 bg-green-500/10'
              : 'border-neutral-600 hover:border-neutral-500'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-3">
              <SecurityIcons.Verified className="w-12 h-12 text-green-400 mx-auto" />
              <div>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-neutral-400 text-sm">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
              >
                Change File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <SecurityIcons.Upload className="w-12 h-12 text-neutral-400 mx-auto" />
              <div>
                <p className="text-white font-medium mb-2">
                  Drop your PDF document here, or click to browse
                </p>
                <p className="text-neutral-400 text-sm">
                  Only PDF files are supported
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="primary"
                icon={<SecurityIcons.Upload className="w-4 h-4" />}
              >
                Select Document
              </Button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />
      </Card>

      {/* Description */}
      <Card variant="glass" padding="lg">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <SecurityIcons.Edit className="w-6 h-6 mr-3 text-primary-400" />
          Description (Optional)
        </h3>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for this multi-signature request..."
          className="w-full bg-neutral-800/50 border border-neutral-600 rounded-lg px-4 py-3 text-white placeholder-neutral-400 focus:border-primary-500 focus:outline-none resize-none"
          rows={3}
          maxLength={500}
        />
        <p className="text-neutral-400 text-sm mt-2">
          {description.length}/500 characters
        </p>
      </Card>

      {/* Signers */}
      <Card variant="glass" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <SecurityIcons.Users className="w-6 h-6 mr-3 text-primary-400" />
            Signers ({signers.filter(s => s.customId.trim()).length})
          </h3>
          <Button
            onClick={addSigner}
            variant="outline"
            size="sm"
            icon={<SecurityIcons.Plus className="w-4 h-4" />}
          >
            Add Signer
          </Button>
        </div>

        <div className="space-y-3">
          {signers.map((signer, index) => (
            <div key={signer.id} className="flex items-center space-x-3 p-4 bg-neutral-800/30 rounded-lg border border-neutral-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-300 font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="text-neutral-400 text-sm">
                  {index === 0 ? 'First' : index === signers.length - 1 ? 'Last' : `${index + 1}${index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}`}
                </div>
              </div>

              <input
                type="text"
                value={signer.customId}
                onChange={(e) => updateSignerCustomId(signer.id, e.target.value)}
                placeholder="Enter Signer ID (e.g., ABC123DEF456GHI)"
                className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:border-primary-500 focus:outline-none"
                maxLength={18}
              />

              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => moveSignerUp(signer.id)}
                  disabled={index === 0}
                  variant="ghost"
                  size="sm"
                  icon={<SecurityIcons.ChevronUp className="w-4 h-4" />}
                />
                <Button
                  onClick={() => moveSignerDown(signer.id)}
                  disabled={index === signers.length - 1}
                  variant="ghost"
                  size="sm"
                  icon={<SecurityIcons.ChevronDown className="w-4 h-4" />}
                />
                {signers.length > 1 && (
                  <Button
                    onClick={() => removeSigner(signer.id)}
                    variant="ghost"
                    size="sm"
                    icon={<SecurityIcons.Trash className="w-4 h-4" />}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <SecurityIcons.Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium mb-1">Sequential Signing</p>
              <p className="text-blue-200">
                Signers will be notified and can sign in the order shown above. Each signer must complete their signature before the next signer can proceed.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Upload Result */}
      {uploadResult && (
        <Card
          variant="outline"
          padding="md"
          className={`${uploadResult.success
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-red-500/30 bg-red-500/10'
            }`}
        >
          <div className="flex items-start space-x-3">
            {uploadResult.success ? (
              <SecurityIcons.Verified className="w-5 h-5 text-green-400 mt-0.5" />
            ) : (
              <SecurityIcons.Alert className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${uploadResult.success ? 'text-green-300' : 'text-red-300'}`}>
                {uploadResult.success ? 'Success!' : 'Error'}
              </p>
              <p className={`text-sm ${uploadResult.success ? 'text-green-200' : 'text-red-200'}`}>
                {uploadResult.message}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          onClick={handleSubmit}
          disabled={isProcessing || !selectedFile || signers.filter(s => s.customId.trim()).length === 0}
          loading={isProcessing}
          variant="primary"
          size="lg"
          fullWidth
          icon={<SecurityIcons.Shield className="w-5 h-5" />}
        >
          {isProcessing ? 'Creating Multi-Signature Request...' : 'Create Multi-Signature Request'}
        </Button>

        {onCancel && (
          <Button
            onClick={onCancel}
            disabled={isProcessing}
            variant="outline"
            size="lg"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

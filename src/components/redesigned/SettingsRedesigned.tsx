'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { Card, SecurityCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, SecurityLevelBadge } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';
import { encryptWallet } from '@/lib/wallet';
import { Wallet } from 'ethers';

interface FormInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  securityLevel?: 'standard' | 'enhanced' | 'maximum';
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  icon,
  securityLevel = 'standard',
}) => {
  const securityColors = {
    standard: 'focus:border-yellow-500 focus:ring-yellow-500/20',
    enhanced: 'focus:border-blue-500 focus:ring-blue-500/20',
    maximum: 'focus:border-green-500 focus:ring-green-500/20',
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-neutral-800/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 transition-all duration-200 ${securityColors[securityLevel]} ${error ? 'border-red-500' : ''}`}
          required={required}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 flex items-center">
          <SecurityIcons.Shield className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

interface SettingsRedesignedProps {
  onPageChange?: (page: string) => void;
}

export const SettingsRedesigned: React.FC<SettingsRedesignedProps> = ({ onPageChange }) => {
  const { wallet, currentUser, logout } = useWallet();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState('settings');
  const [activeTab, setActiveTab] = useState<'security' | 'backup' | 'steganography' | 'account'>('security');

  // Security tab states
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);

  // Backup tab states
  const [exportPassword, setExportPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Steganography tab states
  const [stegoPassword, setStegoPassword] = useState('');
  const [stegoImageName, setStegoImageName] = useState('');
  const [stegoDataType, setStegoDataType] = useState<'wallet_backup' | 'private_key' | 'mnemonic'>('wallet_backup');
  const [stegoExpiryDays, setStegoExpiryDays] = useState<number>(30);
  const [carrierImageFile, setCarrierImageFile] = useState<File | null>(null);
  const [isCreatingStegoImage, setIsCreatingStegoImage] = useState(false);
  const [stegoError, setStegoError] = useState('');
  const [stegoSuccess, setStegoSuccess] = useState('');
  const [stegoKey, setStegoKey] = useState('');
  const [stegoImages, setStegoImages] = useState<any[]>([]);
  const [isLoadingStegoImages, setIsLoadingStegoImages] = useState(false);

  const handleLogout = () => {
    router.push('/logout');
  };

  const handlePageChange = (page: string) => {
    console.log('SettingsRedesigned handlePageChange called with:', page, 'onPageChange available:', !!onPageChange);

    if (onPageChange) {
      // Use the callback from parent component (dashboard sidebar navigation)
      onPageChange(page);
    } else {
      // Fallback to router navigation if no callback (standalone settings page)
      if (page === 'dashboard') {
        router.push('/dashboard');
      } else if (page === 'documents') {
        router.push('/dashboard'); // Navigate back to dashboard with documents view
      } else if (page === 'verify') {
        router.push('/verify');
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleExportKeystore = async () => {
    if (!wallet) return;

    if (exportPassword !== confirmPassword) {
      setExportError('Passwords do not match');
      return;
    }

    if (exportPassword.length < 8) {
      setExportError('Password must be at least 8 characters');
      return;
    }

    setIsExporting(true);
    setExportError('');

    try {
      // Create wallet instance for proper keystore encryption
      const ethersWallet = new Wallet(wallet.privateKey);

      // Use ethers.js to create proper keystore format
      const keystoreJson = await ethersWallet.encrypt(exportPassword);

      // Parse the keystore to add our custom fields
      const keystoreData = JSON.parse(keystoreJson);
      keystoreData.customId = wallet.customId; // Add our custom ID field

      // Download keystore file
      const blob = new Blob([JSON.stringify(keystoreData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keystore-${wallet.customId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Export error:', error);
      setExportError('Failed to export keystore file');
    } finally {
      setIsExporting(false);
    }
  };

  // Steganography functions
  const handleCarrierImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setStegoError('Please select a valid image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setStegoError('Image file must be smaller than 10MB');
        return;
      }
      setCarrierImageFile(file);
      setStegoError('');
    }
  };

  const handleCreateStegoImage = async () => {
    if (!wallet || !stegoPassword || !stegoImageName) {
      setStegoError('Please fill in all required fields');
      return;
    }

    if (stegoPassword.length < 8) {
      setStegoError('Password must be at least 8 characters long');
      return;
    }

    setIsCreatingStegoImage(true);
    setStegoError('');
    setStegoSuccess('');

    try {
      // Prepare carrier image data if provided
      let carrierImageData: string | undefined;
      if (carrierImageFile) {
        const reader = new FileReader();
        carrierImageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(carrierImageFile);
        });
      }

      // Create steganographic backup
      const response = await fetch('/api/steganography/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletData: {
            mnemonic: wallet.mnemonic,
            privateKey: wallet.privateKey,
            address: wallet.address,
            customId: currentUser?.custom_id
          },
          password: stegoPassword,
          imageName: stegoImageName,
          dataType: stegoDataType,
          expiresInDays: stegoExpiryDays > 0 ? stegoExpiryDays : undefined,
          carrierImage: carrierImageData
        })
      });

      const result = await response.json();

      if (result.success) {
        setStegoKey(result.stegoKey);
        setStegoSuccess(`Steganographic backup created successfully! Image ID: ${result.imageId}`);
        // Reset form
        setStegoPassword('');
        setStegoImageName('');
        setCarrierImageFile(null);
        // Reload images list
        loadStegoImages();
      } else {
        setStegoError(result.error || 'Failed to create steganographic backup');
      }
    } catch (error) {
      console.error('Error creating steganographic backup:', error);
      setStegoError('Failed to create steganographic backup');
    } finally {
      setIsCreatingStegoImage(false);
    }
  };

  const loadStegoImages = async () => {
    setIsLoadingStegoImages(true);
    try {
      const response = await fetch('/api/steganography/list');
      const result = await response.json();

      if (result.success) {
        setStegoImages(result.images || []);
      } else {
        console.error('Failed to load steganographic images:', result.error);
      }
    } catch (error) {
      console.error('Error loading steganographic images:', error);
    } finally {
      setIsLoadingStegoImages(false);
    }
  };

  const handleDownloadStegoImage = async (imageId: string, imageName: string) => {
    try {
      const response = await fetch(`/api/steganography/download/${imageId}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = imageName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Reload images to update download count
        loadStegoImages();
      } else {
        const error = await response.json();
        setStegoError(error.error || 'Failed to download image');
      }
    } catch (error) {
      console.error('Error downloading steganographic image:', error);
      setStegoError('Failed to download image');
    }
  };

  const handleDeleteStegoImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this steganographic backup? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/steganography/${imageId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setStegoSuccess('Steganographic backup deleted successfully');
        loadStegoImages();
      } else {
        setStegoError(result.error || 'Failed to delete steganographic backup');
      }
    } catch (error) {
      console.error('Error deleting steganographic image:', error);
      setStegoError('Failed to delete steganographic backup');
    }
  };

  // Load steganographic images when tab is opened
  useEffect(() => {
    if (activeTab === 'steganography') {
      loadStegoImages();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'security' as const, label: 'Security', icon: SecurityIcons.Shield },
    { id: 'backup' as const, label: 'Backup & Export', icon: SecurityIcons.Key },
    { id: 'steganography' as const, label: 'Steganography', icon: SecurityIcons.Activity },
    { id: 'account' as const, label: 'Account', icon: SecurityIcons.Fingerprint },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onLogout={handleLogout}
        userInfo={{
          customId: currentUser?.custom_id || 'Unknown',
          address: wallet?.address || ''
        }}
      />

      {/* Main Content - Fixed sidebar overlap with proper margin */}
      <div className="lg:ml-64">
        <main className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-neutral-400">
              Manage your security settings, backup options, and account preferences.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-8">
            {tabs.map((tab) => {
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

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Private Key Section */}
              <SecurityCard
                title="Private Key"
                description="Your private key provides full access to your signing identity"
                icon={<SecurityIcons.Key className="w-6 h-6" />}
                securityLevel="maximum"
              >
                <div className="space-y-4">
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <SecurityIcons.Shield className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <h4 className="text-red-300 font-medium mb-1">Critical Security Warning</h4>
                        <p className="text-red-200 text-sm">
                          Never share your private key with anyone. Anyone with access to your private key can sign documents on your behalf and access your identity.
                        </p>
                      </div>
                    </div>
                  </div>

                  {showPrivateKey && wallet ? (
                    <div className="space-y-3">
                      <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-600">
                        <p className="font-mono text-sm break-all text-neutral-300">{wallet.privateKey}</p>
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => copyToClipboard(wallet.privateKey)}
                          variant="outline"
                          size="sm"
                          icon={<SecurityIcons.Document className="w-4 h-4" />}
                        >
                          Copy to Clipboard
                        </Button>
                        <Button
                          onClick={() => setShowPrivateKey(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Hide Private Key
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowPrivateKey(true)}
                      variant="danger"
                      icon={<SecurityIcons.Key className="w-4 h-4" />}
                    >
                      Reveal Private Key
                    </Button>
                  )}
                </div>
              </SecurityCard>

              {/* Recovery Phrase Section */}
              <SecurityCard
                title="Recovery Phrase"
                description="Your 12-word recovery phrase can restore your identity"
                icon={<SecurityIcons.Fingerprint className="w-6 h-6" />}
                securityLevel="enhanced"
              >
                <div className="space-y-4">
                  <div className="bg-warning-500/20 border border-warning-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <SecurityIcons.Shield className="w-5 h-5 text-warning-400 mt-0.5" />
                      <div>
                        <h4 className="text-warning-300 font-medium mb-1">Security Notice</h4>
                        <p className="text-warning-200 text-sm">
                          Store your recovery phrase in a secure location. It's the only way to recover your identity if you lose access to this device.
                        </p>
                      </div>
                    </div>
                  </div>

                  {showMnemonic && wallet?.mnemonic ? (
                    <div className="space-y-3">
                      <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-600">
                        <div className="grid grid-cols-3 gap-2">
                          {wallet.mnemonic.split(' ').map((word, index) => (
                            <div key={index} className="bg-neutral-700/50 p-2 rounded text-center">
                              <span className="text-xs text-neutral-400">{index + 1}</span>
                              <p className="text-sm text-white font-mono">{word}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => copyToClipboard(wallet.mnemonic)}
                          variant="outline"
                          size="sm"
                          icon={<SecurityIcons.Document className="w-4 h-4" />}
                        >
                          Copy Recovery Phrase
                        </Button>
                        <Button
                          onClick={() => setShowMnemonic(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Hide Recovery Phrase
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowMnemonic(true)}
                      variant="danger"
                      icon={<SecurityIcons.Fingerprint className="w-4 h-4" />}
                    >
                      Reveal Recovery Phrase
                    </Button>
                  )}
                </div>
              </SecurityCard>
            </div>
          )}

          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <SecurityCard
                title="Export Keystore File"
                description="Create an encrypted backup file of your identity"
                icon={<SecurityIcons.Document className="w-6 h-6" />}
                securityLevel="enhanced"
              >
                <div className="space-y-4">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <SecurityIcons.Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="text-blue-300 font-medium mb-1">Keystore Export</h4>
                        <p className="text-blue-200 text-sm">
                          A keystore file is an encrypted backup of your private key. You can use it to import your identity on other devices or applications.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormInput
                      label="Export Password"
                      type="password"
                      value={exportPassword}
                      onChange={setExportPassword}
                      placeholder="Create a strong password for the keystore file"
                      required
                      icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                      securityLevel="enhanced"
                    />

                    <FormInput
                      label="Confirm Password"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirm your password"
                      required
                      error={exportError}
                      icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                      securityLevel="enhanced"
                    />

                    <Button
                      onClick={handleExportKeystore}
                      loading={isExporting}
                      disabled={!exportPassword || !confirmPassword}
                      icon={<SecurityIcons.Document className="w-4 h-4" />}
                    >
                      {isExporting ? 'Exporting...' : 'Export Keystore File'}
                    </Button>
                  </div>
                </div>
              </SecurityCard>
            </div>
          )}

          {/* Steganography Tab */}
          {activeTab === 'steganography' && (
            <div className="space-y-6">
              {/* Information Card */}
              <SecurityCard
                title="Steganographic Backups"
                description="Hide your encrypted wallet data within innocent-looking images for ultimate security"
                icon={<SecurityIcons.Activity className="w-6 h-6" />}
                securityLevel="maximum"
              >
                <div className="space-y-4">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <SecurityIcons.Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="text-blue-300 font-medium mb-1">What is Steganography?</h4>
                        <p className="text-blue-200 text-sm">
                          Steganography hides your encrypted wallet data inside ordinary images. Even if someone finds the image,
                          they won't know it contains hidden data without the steganography key.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SecurityCard>

              {/* Create Steganographic Backup */}
              <SecurityCard
                title="Create Hidden Backup"
                description="Generate a steganographic backup of your wallet data"
                icon={<SecurityIcons.Document className="w-6 h-6" />}
                securityLevel="enhanced"
              >
                <div className="space-y-4">
                  {stegoError && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-300 text-sm">{stegoError}</p>
                    </div>
                  )}

                  {stegoSuccess && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                      <p className="text-green-300 text-sm">{stegoSuccess}</p>
                    </div>
                  )}

                  {stegoKey && (
                    <div className="bg-warning-500/20 border border-warning-500/30 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <SecurityIcons.Key className="w-5 h-5 text-warning-400 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-warning-300 font-medium mb-2">Your Steganography Key</h4>
                          <p className="text-warning-200 text-sm mb-3">
                            Save this key securely! You need it to extract your hidden data. This is the only time it will be shown.
                          </p>
                          <div className="bg-neutral-800/50 p-3 rounded border border-neutral-600">
                            <p className="font-mono text-sm break-all text-white">{stegoKey}</p>
                          </div>
                          <div className="flex space-x-3 mt-3">
                            <Button
                              onClick={() => copyToClipboard(stegoKey)}
                              variant="outline"
                              size="sm"
                              icon={<SecurityIcons.Document className="w-4 h-4" />}
                            >
                              Copy Key
                            </Button>
                            <Button
                              onClick={() => setStegoKey('')}
                              variant="ghost"
                              size="sm"
                            >
                              Hide Key
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Backup Name"
                      type="text"
                      value={stegoImageName}
                      onChange={setStegoImageName}
                      placeholder="My Wallet Backup"
                      required
                      icon={<SecurityIcons.Document className="w-5 h-5 text-neutral-400" />}
                    />

                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Data Type</label>
                      <select
                        value={stegoDataType}
                        onChange={(e) => setStegoDataType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                      >
                        <option value="wallet_backup">Complete Wallet Backup</option>
                        <option value="private_key">Private Key Only</option>
                        <option value="mnemonic">Recovery Phrase Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Encryption Password"
                      type="password"
                      value={stegoPassword}
                      onChange={setStegoPassword}
                      placeholder="Strong password for encryption"
                      required
                      icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                    />

                    <FormInput
                      label="Expires in Days (0 = never)"
                      type="number"
                      value={stegoExpiryDays.toString()}
                      onChange={(value) => setStegoExpiryDays(parseInt(value) || 0)}
                      placeholder="30"
                      min="0"
                      max="365"
                      icon={<SecurityIcons.Activity className="w-5 h-5 text-neutral-400" />}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Carrier Image (Optional)
                    </label>
                    <p className="text-xs text-neutral-400 mb-2">
                      Upload your own image to hide data in, or leave empty to use a default carrier image.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCarrierImageUpload}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-500 file:text-white hover:file:bg-primary-600"
                    />
                    {carrierImageFile && (
                      <p className="text-sm text-green-400 mt-1">
                        Selected: {carrierImageFile.name} ({(carrierImageFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleCreateStegoImage}
                    loading={isCreatingStegoImage}
                    disabled={!stegoPassword || !stegoImageName}
                    icon={<SecurityIcons.Activity className="w-4 h-4" />}
                    fullWidth
                  >
                    {isCreatingStegoImage ? 'Creating Hidden Backup...' : 'Create Steganographic Backup'}
                  </Button>
                </div>
              </SecurityCard>

              {/* Existing Steganographic Backups */}
              <SecurityCard
                title="Your Hidden Backups"
                description="Manage your existing steganographic backups"
                icon={<SecurityIcons.Shield className="w-6 h-6" />}
                securityLevel="enhanced"
              >
                <div className="space-y-4">
                  {isLoadingStegoImages ? (
                    <div className="text-center py-4">
                      <p className="text-neutral-400">Loading backups...</p>
                    </div>
                  ) : stegoImages.length === 0 ? (
                    <div className="text-center py-8">
                      <SecurityIcons.Document className="w-12 h-12 text-neutral-500 mx-auto mb-3" />
                      <p className="text-neutral-400">No steganographic backups found</p>
                      <p className="text-neutral-500 text-sm">Create your first hidden backup above</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stegoImages.map((image) => (
                        <div key={image.id} className="bg-neutral-800/50 border border-neutral-600 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{image.imageName}</h4>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-neutral-400">
                                  Type: {image.dataType.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-neutral-400">
                                  Size: {(image.fileSize / 1024).toFixed(1)} KB
                                </span>
                                <span className="text-xs text-neutral-400">
                                  Downloads: {image.downloadCount}
                                </span>
                                <span className="text-xs text-neutral-400">
                                  Created: {new Date(image.createdAt).toLocaleDateString()}
                                </span>
                                {image.expiresAt && (
                                  <span className="text-xs text-warning-400">
                                    Expires: {new Date(image.expiresAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleDownloadStegoImage(image.id, image.imageName)}
                                variant="outline"
                                size="sm"
                                icon={<SecurityIcons.Document className="w-4 h-4" />}
                              >
                                Download
                              </Button>
                              <Button
                                onClick={() => handleDeleteStegoImage(image.id)}
                                variant="danger"
                                size="sm"
                                icon={<SecurityIcons.Activity className="w-4 h-4" />}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SecurityCard>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <Card variant="glass" padding="lg">
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">Custom ID</label>
                    <p className="text-white font-mono">{currentUser?.custom_id || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">Wallet Address</label>
                    <p className="text-white font-mono text-sm break-all">{wallet?.address || 'Unknown'}</p>
                  </div>
                </div>
              </Card>

              <Card variant="glass" padding="lg">
                <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>
                <div className="space-y-4">
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-red-300 font-medium mb-2">Sign Out</h4>
                    <p className="text-red-200 text-sm mb-4">
                      This will sign you out of your current session. Your identity will remain encrypted on this device.
                    </p>
                    <Button
                      onClick={handleLogout}
                      variant="danger"
                      icon={<SecurityIcons.Activity className="w-4 h-4" />}
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SettingsRedesigned;

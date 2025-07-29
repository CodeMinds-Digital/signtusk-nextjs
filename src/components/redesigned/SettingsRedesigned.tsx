'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { Card, SecurityCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, SecurityLevelBadge } from '../ui/DesignSystem';
import { Navigation } from '../ui/Navigation';
import { encryptWallet } from '@/lib/wallet';

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
  const [activeTab, setActiveTab] = useState<'security' | 'backup' | 'account'>('security');

  // Security tab states
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);

  // Backup tab states
  const [exportPassword, setExportPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleLogout = () => {
    router.push('/logout');
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
      // Create keystore file
      const encryptedWallet = encryptWallet(wallet, exportPassword);
      const keystoreData = {
        version: 3,
        id: crypto.randomUUID(),
        address: wallet.address.toLowerCase().replace('0x', ''),
        crypto: {
          ciphertext: encryptedWallet.encryptedPrivateKey,
          cipherparams: { iv: encryptedWallet.salt },
          cipher: 'aes-128-ctr',
          kdf: 'pbkdf2',
          kdfparams: {
            dklen: 32,
            salt: encryptedWallet.salt,
            c: 10000,
            prf: 'hmac-sha256'
          },
          mac: encryptedWallet.salt
        },
        customId: wallet.customId
      };

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

  const tabs = [
    { id: 'security' as const, label: 'Security', icon: SecurityIcons.Shield },
    { id: 'backup' as const, label: 'Backup & Export', icon: SecurityIcons.Key },
    { id: 'account' as const, label: 'Account', icon: SecurityIcons.Fingerprint },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navigation
        currentPage={currentPage}
        onPageChange={onPageChange || setCurrentPage}
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
                      variant="warning"
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

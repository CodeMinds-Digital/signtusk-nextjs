'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, SecurityCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, SecurityLevelBadge, LoadingSpinner } from '../ui/DesignSystem';
import { restoreWalletFromMnemonic, encryptWallet, validateMnemonic, getChecksumAddress, WalletData } from '@/lib/wallet';
import { storeEncryptedWallet } from '@/lib/multi-wallet-storage';
import { getAuthChallenge, verifySignature } from '@/lib/storage';
import { Wallet } from 'ethers';
import { useWallet } from '@/contexts/WalletContext-Updated';

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

export const ImportRedesigned: React.FC = () => {
  const { setWallet, getSignerId } = useWallet();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'method' | 'mnemonic' | 'keystore' | 'private-key' | 'complete'>('method');
  const [importMethod, setImportMethod] = useState<'mnemonic' | 'keystore' | 'private-key'>('mnemonic');

  // Mnemonic import
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Keystore import
  const [keystoreFile, setKeystoreFile] = useState<File | null>(null);
  const [keystorePassword, setKeystorePassword] = useState('');

  // Private key import
  const [privateKey, setPrivateKey] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [importedWallet, setImportedWallet] = useState<WalletData | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string): boolean => {
    return password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password);
  };

  const importMethods = [
    {
      id: 'mnemonic' as const,
      title: 'Recovery Phrase',
      description: 'Import using your 12-word recovery phrase',
      icon: SecurityIcons.Key,
      recommended: true,
    },
    {
      id: 'keystore' as const,
      title: 'Keystore File',
      description: 'Import using a keystore JSON file',
      icon: SecurityIcons.Document,
    },
    {
      id: 'private-key' as const,
      title: 'Private Key',
      description: 'Import using your private key directly',
      icon: SecurityIcons.Fingerprint,
    },
  ];

  const handleMethodSelect = (method: 'mnemonic' | 'keystore' | 'private-key') => {
    setImportMethod(method);
    setCurrentStep(method);
  };

  const handleMnemonicImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!mnemonic.trim()) {
      setError('Please enter your recovery phrase');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and numbers');
      return;
    }

    setIsLoading(true);
    try {
      // Validate mnemonic
      if (!validateMnemonic(mnemonic)) {
        throw new Error('Invalid recovery phrase');
      }

      // Restore wallet from mnemonic
      const walletData = restoreWalletFromMnemonic(mnemonic);

      // Encrypt and store wallet
      const encryptedWallet = encryptWallet(walletData, password);
      storeEncryptedWallet(encryptedWallet);

      setImportedWallet(walletData);
      setSuccess(true);
      setCurrentStep('complete');
    } catch (err) {
      console.error('Mnemonic import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeystoreImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!keystoreFile || !keystorePassword) {
      setError('Please select a keystore file and enter the password');
      return;
    }

    setIsLoading(true);
    try {
      const keystoreContent = await keystoreFile.text();
      const keystoreData = JSON.parse(keystoreContent);

      // Import from keystore using ethers
      const wallet = await Wallet.fromEncryptedJson(keystoreContent, keystorePassword);

      const walletData: WalletData = {
        address: getChecksumAddress(wallet.address),
        privateKey: wallet.privateKey,
        mnemonic: '', // Keystore doesn't contain mnemonic
        customId: `IMPORTED-${Date.now()}`, // Temporary ID for local storage
      };

      // Encrypt and store wallet
      const encryptedWallet = encryptWallet(walletData, keystorePassword);
      storeEncryptedWallet(encryptedWallet);

      setImportedWallet(walletData);
      setSuccess(true);
      setCurrentStep('complete');
    } catch (err) {
      console.error('Keystore import error:', err);
      setError('Failed to import keystore. Please check your file and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivateKeyImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!privateKey || !password || !customId) {
      setError('Please fill in all required fields');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and numbers');
      return;
    }

    setIsLoading(true);
    try {
      // Create wallet from private key
      const wallet = new Wallet(privateKey);

      const walletData: WalletData = {
        address: getChecksumAddress(wallet.address),
        privateKey: wallet.privateKey,
        mnemonic: '', // Private key import doesn't have mnemonic
        customId: `IMPORTED-${Date.now()}`, // Temporary ID for local storage
      };

      // Encrypt and store wallet
      const encryptedWallet = encryptWallet(walletData, password);
      storeEncryptedWallet(encryptedWallet);

      setImportedWallet(walletData);
      setSuccess(true);
      setCurrentStep('complete');
    } catch (err) {
      console.error('Private key import error:', err);
      setError('Failed to import private key. Please check your key and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteImport = async () => {
    if (!importedWallet) return;

    try {
      // Get fresh challenge and sign it
      const nonce = await getAuthChallenge(importedWallet.address);

      // Create wallet instance for signing
      const wallet = new Wallet(importedWallet.privateKey);
      const signature = await wallet.signMessage(nonce);

      // Verify signature with server
      await verifySignature(importedWallet.address, signature);

      // Set wallet in context
      setWallet(importedWallet);

      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Auto-login error:', error);
      // If auto-login fails, redirect to login page
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <SecurityIcons.Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Import Your Identity</h1>
          <p className="text-neutral-400">Restore your existing signing identity to SignTusk</p>
        </div>

        {/* Import Method Selection */}
        {currentStep === 'method' && (
          <Card variant="glass" padding="lg">
            <h2 className="text-xl font-semibold text-white mb-6">Choose Import Method</h2>

            <div className="space-y-4">
              {importMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                    className="w-full p-4 rounded-xl border border-neutral-600 hover:border-primary-500 bg-neutral-800/30 hover:bg-neutral-800/50 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{method.title}</h3>
                          <p className="text-sm text-neutral-400">{method.description}</p>
                        </div>
                      </div>
                      {method.recommended && (
                        <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-1 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-700">
              <Button
                variant="outline"
                fullWidth
                onClick={() => router.push('/')}
                icon={<SecurityIcons.Shield className="w-4 h-4" />}
              >
                Back to Homepage
              </Button>
            </div>
          </Card>
        )}

        {/* Mnemonic Import */}
        {currentStep === 'mnemonic' && (
          <Card variant="glass" padding="lg">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('method')}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 mr-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold text-white">Import Recovery Phrase</h2>
                <p className="text-sm text-neutral-400">Enter your 12-word recovery phrase</p>
              </div>
            </div>

            <form onSubmit={handleMnemonicImport} className="space-y-6">
              <FormInput
                label="Recovery Phrase"
                value={mnemonic}
                onChange={setMnemonic}
                placeholder="Enter your 12-word recovery phrase separated by spaces"
                required
                icon={<SecurityIcons.Key className="w-5 h-5 text-neutral-400" />}
                securityLevel="enhanced"
              />

              <FormInput
                label="New Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Create a strong password"
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
                icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                securityLevel="enhanced"
              />

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="bg-warning-500/20 border border-warning-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <SecurityIcons.Shield className="w-5 h-5 text-warning-400 mt-0.5" />
                  <div>
                    <h4 className="text-warning-300 font-medium mb-1">Security Notice</h4>
                    <p className="text-warning-200 text-sm">
                      Make sure you're in a secure environment. Never share your recovery phrase with anyone.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                disabled={!mnemonic.trim() || !password || !confirmPassword}
              >
                {isLoading ? 'Importing Identity...' : 'Import Identity'}
              </Button>
            </form>
          </Card>
        )}

        {/* Keystore Import */}
        {currentStep === 'keystore' && (
          <Card variant="glass" padding="lg">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('method')}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 mr-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold text-white">Import Keystore File</h2>
                <p className="text-sm text-neutral-400">Upload your keystore JSON file</p>
              </div>
            </div>

            <form onSubmit={handleKeystoreImport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Keystore File <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setKeystoreFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-500 file:text-white hover:file:bg-primary-600 transition-all duration-200"
                />
              </div>

              <FormInput
                label="Keystore Password"
                type="password"
                value={keystorePassword}
                onChange={setKeystorePassword}
                placeholder="Enter keystore password"
                required
                error={error}
                icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                securityLevel="enhanced"
              />

              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                disabled={!keystoreFile || !keystorePassword}
              >
                {isLoading ? 'Importing Keystore...' : 'Import Keystore'}
              </Button>
            </form>
          </Card>
        )}

        {/* Private Key Import */}
        {currentStep === 'private-key' && (
          <Card variant="glass" padding="lg">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('method')}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 mr-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold text-white">Import Private Key</h2>
                <p className="text-sm text-neutral-400">Enter your private key directly</p>
              </div>
            </div>

            <form onSubmit={handlePrivateKeyImport} className="space-y-6">
              <FormInput
                label="Private Key"
                type="password"
                value={privateKey}
                onChange={setPrivateKey}
                placeholder="Enter your private key"
                required
                icon={<SecurityIcons.Fingerprint className="w-5 h-5 text-neutral-400" />}
                securityLevel="maximum"
              />

              <FormInput
                label="New Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Create a new password"
                required
                error={error}
                icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                securityLevel="maximum"
              />

              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <SecurityIcons.Shield className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <h4 className="text-red-300 font-medium mb-1">High Security Risk</h4>
                    <p className="text-red-200 text-sm">
                      Importing private keys directly is less secure. Use recovery phrase when possible.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                disabled={!privateKey || !password}
                variant="danger"
              >
                {isLoading ? 'Importing Private Key...' : 'Import Private Key'}
              </Button>
            </form>
          </Card>
        )}

        {/* Complete */}
        {currentStep === 'complete' && (
          <Card variant="glass" padding="lg" className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 trust-glow">
              <SecurityIcons.Verified className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Identity Imported Successfully!</h2>
            <p className="text-neutral-300 mb-6">
              Your signing identity has been restored and is ready to use.
            </p>
            {importedWallet && (
              <div className="bg-neutral-800/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-neutral-400 mb-1">Address:</p>
                <p className="text-white font-mono text-sm">{importedWallet.address}</p>
                {getSignerId() && (
                  <>
                    <p className="text-sm text-neutral-400 mb-1 mt-2">Custom ID:</p>
                    <p className="text-white font-medium">{getSignerId()}</p>
                  </>
                )}
              </div>
            )}
            <Button
              onClick={handleCompleteImport}
              fullWidth
              loading={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Continue to Dashboard'}
            </Button>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-neutral-400 text-sm">
            Don't have an identity?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              Create one now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImportRedesigned;

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, SecurityCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, SecurityLevelBadge, LoadingSpinner } from '../ui/DesignSystem';
import { decryptWallet, getRandomWordsForVerification, verifyMnemonicWords, getChecksumAddress, WalletData } from '@/lib/wallet';
import { getEncryptedWallet, getStoredWalletList, setCurrentWalletAddress, removeStoredWallet } from '@/lib/multi-wallet-storage';
import { generateWalletWithUniqueId, generateCustomId } from '@/lib/wallet';
import { getAuthChallenge, verifySignature } from '@/lib/storage';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet } from 'ethers';
import { createSecureWallet } from '@/lib/security-manager';

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

type LoginStep = 'wallet-select' | 'password' | 'mnemonic-verify' | 'complete';

interface LoginRedesignedProps {
  onSuccess?: () => void;
}

export const LoginRedesigned: React.FC<LoginRedesignedProps> = ({ onSuccess }) => {
  const { setWallet, refreshAuth } = useWallet();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<LoginStep>('wallet-select');
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string>('');
  const [password, setPassword] = useState('');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [verificationWords, setVerificationWords] = useState<Array<{ index: number, word: string }>>([]);
  const [userVerificationInputs, setUserVerificationInputs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [storedWallets, setStoredWallets] = useState<Array<{ address: string, customId: string }>>([]);

  useEffect(() => {
    // Load stored wallets
    const wallets = getStoredWalletList();
    setStoredWallets(wallets);
  }, []);

  const handleWalletSelect = (address: string) => {
    setSelectedWalletAddress(address);
    setCurrentStep('password');
  };

  const handleDeleteWallet = async (address: string, customId: string, event: React.MouseEvent) => {
    // Prevent the wallet selection when clicking delete
    event.stopPropagation();

    const confirmMessage = `Are you sure you want to delete the signing identity "${customId}"?\n\nThis action cannot be undone. Make sure you have your recovery phrase saved if you want to restore this identity later.`;

    if (window.confirm(confirmMessage)) {
      try {
        // Remove wallet from local storage
        removeStoredWallet(address);

        // Update available wallets list
        const updatedWallets = getStoredWalletList();
        setStoredWallets(updatedWallets);

        // If no wallets left, they'll see the "no wallets" message
        // If only one wallet left, user can select it manually

        // Show success message briefly
        alert(`Identity "${customId}" has been deleted successfully.`);
      } catch (error) {
        console.error('Failed to delete wallet:', error);
        alert('Failed to delete identity. Please try again.');
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Get encrypted wallet data
      const encryptedWallet = getEncryptedWallet(selectedWalletAddress);
      if (!encryptedWallet) {
        throw new Error('Wallet not found');
      }

      // Decrypt wallet
      const decryptedWallet = decryptWallet(encryptedWallet, password);
      setWalletData(decryptedWallet);

      // Generate random words for verification
      const randomWords = getRandomWordsForVerification(decryptedWallet.mnemonic);
      setVerificationWords(randomWords);
      setUserVerificationInputs(new Array(randomWords.length).fill(''));
      setCurrentStep('mnemonic-verify');
    } catch (error) {
      console.error('Password verification error:', error);
      setError('Invalid password or corrupted wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMnemonicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!walletData) {
      setError('Wallet data not available');
      return;
    }

    // Create verification array with user inputs
    const userWords = verificationWords.map((word, index) => ({
      index: word.index,
      word: userVerificationInputs[index]?.trim().toLowerCase() || ''
    }));

    // Verify mnemonic words using the correct function signature
    if (!verifyMnemonicWords(walletData.mnemonic, userWords)) {
      setError('Incorrect words. Please check and try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Get fresh challenge and sign it
      const nonce = await getAuthChallenge(walletData.address);

      // Create wallet instance for signing
      const wallet = new Wallet(walletData.privateKey);
      const signature = await wallet.signMessage(nonce);

      // Verify signature with server
      await verifySignature(walletData.address, signature);

      // Refresh authentication state
      await refreshAuth();

      // Set wallet in context
      setWallet(walletData);

      setCurrentStep('complete');
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWalletData = storedWallets.find(w => w.address === selectedWalletAddress);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <SecurityIcons.Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-neutral-400">Sign in to your secure SignTusk identity</p>
        </div>

        {/* Wallet Selection */}
        {currentStep === 'wallet-select' && (
          <Card variant="glass" padding="lg">
            <h2 className="text-xl font-semibold text-white mb-4">Select Your Identity</h2>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
              <p className="text-blue-300 text-sm">
                🔐 Choose which signing identity you want to access. Hover over an identity to see the delete option.
              </p>
            </div>

            {storedWallets.length === 0 ? (
              <div className="text-center py-8">
                <SecurityIcons.Key className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-400 mb-2">No identities found</h3>
                <p className="text-neutral-500 mb-4">Create a new identity or import an existing one</p>
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/signup')}
                    fullWidth
                    icon={<SecurityIcons.Shield className="w-4 h-4" />}
                  >
                    Create New Identity
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/import')}
                    fullWidth
                    icon={<SecurityIcons.Key className="w-4 h-4" />}
                  >
                    Import Existing Identity
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {storedWallets.map((wallet) => (
                    <div
                      key={wallet.address}
                      className="relative group"
                    >
                      <button
                        onClick={() => handleWalletSelect(wallet.address)}
                        className="w-full p-4 rounded-xl border border-neutral-600 hover:border-primary-500 bg-neutral-800/30 hover:bg-neutral-800/50 transition-all duration-200 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-4">
                            <p className="font-semibold text-white">{wallet.customId}</p>
                            <p className="text-sm text-neutral-400">{getChecksumAddress(wallet.address)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => handleDeleteWallet(wallet.address, wallet.customId, e)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                              title={`Delete ${wallet.customId}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <SecurityIcons.Shield className="w-5 h-5 text-primary-400" />
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-neutral-700">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => router.push('/import')}
                    icon={<SecurityIcons.Key className="w-4 h-4" />}
                  >
                    Import Different Identity
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {/* Password Step */}
        {currentStep === 'password' && selectedWalletData && (
          <Card variant="glass" padding="lg">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('wallet-select')}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 mr-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold text-white">Unlock Identity</h2>
                <p className="text-sm text-neutral-400">{selectedWalletData.customId}</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <FormInput
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                required
                error={error}
                icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                securityLevel="enhanced"
              />

              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                disabled={!password}
              >
                {isLoading ? 'Unlocking...' : 'Unlock Identity'}
              </Button>
            </form>
          </Card>
        )}

        {/* Mnemonic Verification */}
        {currentStep === 'mnemonic-verify' && selectedWalletData && (
          <Card variant="glass" padding="lg">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('password')}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 mr-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold text-white">Verify Identity</h2>
                <p className="text-sm text-neutral-400">Enter the requested words from your recovery phrase</p>
              </div>
            </div>

            <form onSubmit={handleMnemonicSubmit} className="space-y-6">
              <div className="bg-neutral-800/50 rounded-xl p-4 mb-4">
                <p className="text-neutral-300 text-sm mb-3">
                  Please enter the following words from your recovery phrase:
                </p>
                <div className="space-y-3">
                  {verificationWords.map((wordInfo, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-neutral-400 text-sm w-16">
                        Word #{wordInfo.index}:
                      </span>
                      <input
                        type="text"
                        value={userVerificationInputs[index] || ''}
                        onChange={(e) => {
                          const newInputs = [...userVerificationInputs];
                          newInputs[index] = e.target.value;
                          setUserVerificationInputs(newInputs);
                        }}
                        placeholder="Enter word"
                        className="flex-1 px-3 py-2 bg-neutral-700/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all duration-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep('password')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={userVerificationInputs.some(input => !input?.trim())}
                  className="flex-1"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Complete */}
        {currentStep === 'complete' && (
          <Card variant="glass" padding="lg" className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 trust-glow">
              <SecurityIcons.Verified className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Authentication Successful!</h2>
            <p className="text-neutral-300 mb-6">
              Your identity has been verified. You can now sign documents securely.
            </p>
            <Button
              onClick={async () => {
                // Wait a moment to ensure cookie is properly set
                await new Promise(resolve => setTimeout(resolve, 500));
                onSuccess?.();
                router.push('/dashboard');
              }}
              fullWidth
            >
              Go to Dashboard
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

// Signup Redesigned Component
interface SignupRedesignedProps {
  onSuccess?: () => void;
}

export const SignupRedesigned: React.FC<SignupRedesignedProps> = ({ onSuccess }) => {
  const { setWallet } = useWallet();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'security' | 'identity' | 'backup' | 'complete'>('security');
  const [selectedSecurity, setSelectedSecurity] = useState<'standard' | 'enhanced' | 'maximum'>('enhanced');
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate Custom ID when component loads
  useEffect(() => {
    if (!customId) {
      const generatedId = generateCustomId();
      setCustomId(generatedId);
    }
  }, [customId]);

  const handleSecuritySelect = (level: 'standard' | 'enhanced' | 'maximum') => {
    setSelectedSecurity(level);
    setCurrentStep('identity');
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Generate real wallet with unique custom ID
      const newWallet = await generateWalletWithUniqueId(12);
      setWalletData(newWallet);
      setCustomId(newWallet.customId);
      setMnemonicWords(newWallet.mnemonic.split(' '));
      setCurrentStep('backup');
    } catch (err) {
      console.error('Wallet generation error:', err);
      setError('Failed to create identity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupComplete = async () => {
    if (!walletData) {
      setError('Wallet data not available');
      return;
    }

    // Prevent multiple rapid calls
    if (isLoading) {
      console.log('Already processing, ignoring duplicate call');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting wallet creation process:', {
        address: walletData.address,
        customId: walletData.customId,
        customIdLength: walletData.customId?.length,
        selectedSecurity,
        hasPassword: !!password,
        passwordLength: password?.length
      });

      // Validate required data
      if (!password) {
        throw new Error('Password is required for wallet creation');
      }

      if (!walletData) {
        throw new Error('Wallet data is missing');
      }

      // Create wallet with selected security level
      await createSecureWallet(walletData, password, {
        level: selectedSecurity,
        carrierImage: undefined // No carrier image for redesigned flow
      });

      console.log('Wallet created successfully, storing locally and starting authentication...');

      // IMPORTANT: Store wallet locally so it appears on login page
      const { encryptWallet } = await import('@/lib/wallet');
      const { storeEncryptedWallet } = await import('@/lib/multi-wallet-storage');
      const encryptedWallet = encryptWallet(walletData, password);
      storeEncryptedWallet(encryptedWallet);
      console.log('Wallet stored locally for future logins');

      // Perform authentication to log the user in automatically
      // Get fresh challenge and sign it
      const nonce = await getAuthChallenge(walletData.address);

      // Create wallet instance for signing
      const wallet = new Wallet(walletData.privateKey);
      const signature = await wallet.signMessage(nonce);

      // Verify signature with server to establish session
      await verifySignature(walletData.address, signature);

      // Set wallet in context
      setWallet(walletData);

      console.log('Authentication successful, redirecting...');

      setCurrentStep('complete');
      setTimeout(() => {
        onSuccess?.();
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Wallet creation/authentication error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save signing identity');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <SecurityIcons.Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Identity</h1>
          <p className="text-neutral-400">Set up your secure signing identity with SignTusk</p>
        </div>

        {/* Security Level Selection */}
        {currentStep === 'security' && (
          <Card variant="glass" padding="lg">
            <h2 className="text-xl font-semibold text-white mb-6">Choose Security Level</h2>

            <div className="space-y-4">
              <SecurityCard
                title="Standard Security"
                description="Basic encryption with password protection"
                icon={<SecurityIcons.Lock className="w-6 h-6 text-yellow-400" />}
                securityLevel="standard"
                hover
                className="cursor-pointer"
                onClick={() => handleSecuritySelect('standard')}
              >
                <div className="text-sm text-neutral-400 mt-2">
                  • AES-CBC encryption
                  • 10,000 PBKDF2 iterations
                  • Standard security features
                </div>
              </SecurityCard>

              <SecurityCard
                title="Enhanced Security"
                description="Advanced encryption with Web Crypto API"
                icon={<SecurityIcons.Shield className="w-6 h-6 text-blue-400" />}
                securityLevel="enhanced"
                hover
                className="cursor-pointer border-2 border-primary-500/50"
                onClick={() => handleSecuritySelect('enhanced')}
              >
                <div className="text-sm text-neutral-400 mt-2">
                  • AES-GCM encryption
                  • 310,000 PBKDF2 iterations
                  • Enhanced security features
                </div>
                <div className="mt-2">
                  <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
              </SecurityCard>

              <SecurityCard
                title="Maximum Security"
                description="Military-grade encryption with steganography"
                icon={<SecurityIcons.Verified className="w-6 h-6 text-green-400" />}
                securityLevel="maximum"
                hover
                className="cursor-pointer"
                onClick={() => handleSecuritySelect('maximum')}
              >
                <div className="text-sm text-neutral-400 mt-2">
                  • AES-GCM + Steganography
                  • 310,000 PBKDF2 iterations
                  • Maximum security features
                </div>
              </SecurityCard>
            </div>
          </Card>
        )}

        {/* Identity Creation */}
        {currentStep === 'identity' && (
          <Card variant="glass" padding="lg">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentStep('security')}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 mr-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold text-white">Create Identity</h2>
                <SecurityLevelBadge level={selectedSecurity} />
              </div>
            </div>

            <form onSubmit={handleIdentitySubmit} className="space-y-6">
              {/* Auto-generated Custom Identity ID Display */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">
                  Custom Identity ID*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SecurityIcons.Fingerprint className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="w-full pl-10 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white font-mono text-lg tracking-wider">
                    {customId || 'Generating...'}
                  </div>
                </div>
                <p className="text-xs text-neutral-400">
                  Auto-generated unique 18-character identifier
                </p>
              </div>

              <FormInput
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Create a strong password"
                required
                icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                securityLevel={selectedSecurity}
              />

              <FormInput
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm your password"
                required
                error={error}
                icon={<SecurityIcons.Lock className="w-5 h-5 text-neutral-400" />}
                securityLevel={selectedSecurity}
              />

              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                disabled={!customId || !password || !confirmPassword}
              >
                {isLoading ? 'Creating Identity...' : 'Create Identity'}
              </Button>
            </form>
          </Card>
        )}

        {/* Backup Phrase */}
        {currentStep === 'backup' && (
          <Card variant="glass" padding="lg">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-warning-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <SecurityIcons.Key className="w-6 h-6 text-warning-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Backup Your Recovery Phrase</h2>
              <p className="text-neutral-400 text-sm">
                Write down these 12 words in order. You'll need them to recover your identity.
              </p>
            </div>

            <div className="bg-neutral-800/50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-3">
                {mnemonicWords.map((word, index) => (
                  <div key={index} className="bg-neutral-700/50 rounded-lg p-3 text-center">
                    <span className="text-xs text-neutral-400 block">{index + 1}</span>
                    <span className="text-white font-medium">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-warning-500/20 border border-warning-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <SecurityIcons.Shield className="w-5 h-5 text-warning-400 mt-0.5" />
                <div>
                  <h4 className="text-warning-300 font-medium mb-1">Important Security Notice</h4>
                  <p className="text-warning-200 text-sm">
                    Store this phrase securely offline. Anyone with access to it can control your identity.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleBackupComplete}
              fullWidth
              variant="success"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Identity...' : "I've Saved My Recovery Phrase"}
            </Button>

            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </Card>
        )}

        {/* Complete */}
        {currentStep === 'complete' && (
          <Card variant="glass" padding="lg" className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 trust-glow">
              <SecurityIcons.Verified className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Identity Created Successfully!</h2>
            <p className="text-neutral-300 mb-6">
              Your secure signing identity has been created with {selectedSecurity} security level.
            </p>
            <LoadingSpinner size="md" />
            <p className="text-neutral-400 text-sm mt-2">Redirecting to dashboard...</p>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-neutral-400 text-sm">
            Already have an identity?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginRedesigned;

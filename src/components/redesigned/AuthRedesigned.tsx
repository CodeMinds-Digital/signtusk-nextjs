'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, SecurityCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, SecurityLevelBadge, LoadingSpinner } from '../ui/DesignSystem';
import { decryptWallet, getRandomWordsForVerification, verifyMnemonicWords, getChecksumAddress, WalletData } from '@/lib/wallet';
import { getEncryptedWallet, getStoredWalletList, setCurrentWalletAddress, removeStoredWallet } from '@/lib/multi-wallet-storage';
import { getAuthChallenge, verifySignature } from '@/lib/storage';
import { useWallet } from '@/contexts/WalletContext';
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
            <h2 className="text-xl font-semibold text-white mb-6">Select Your Identity</h2>

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
                    <button
                      key={wallet.address}
                      onClick={() => handleWalletSelect(wallet.address)}
                      className="w-full p-4 rounded-xl border border-neutral-600 hover:border-primary-500 bg-neutral-800/30 hover:bg-neutral-800/50 transition-all duration-200 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{wallet.customId}</p>
                          <p className="text-sm text-neutral-400">{getChecksumAddress(wallet.address)}</p>
                        </div>
                        <SecurityIcons.Shield className="w-5 h-5 text-primary-400" />
                      </div>
                    </button>
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
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'security' | 'identity' | 'backup' | 'complete'>('security');
  const [selectedSecurity, setSelectedSecurity] = useState<'standard' | 'enhanced' | 'maximum'>('enhanced');
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      // Simulate wallet generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockMnemonic = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent',
        'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'
      ];
      setMnemonicWords(mockMnemonic);
      setCurrentStep('backup');
    } catch (err) {
      setError('Failed to create identity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupComplete = () => {
    setCurrentStep('complete');
    setTimeout(() => {
      onSuccess?.();
      router.push('/dashboard');
    }, 2000);
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
              <FormInput
                label="Custom Identity ID"
                value={customId}
                onChange={setCustomId}
                placeholder="e.g., SIGN-001"
                required
                icon={<SecurityIcons.Fingerprint className="w-5 h-5 text-neutral-400" />}
                securityLevel={selectedSecurity}
              />

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
            >
              I've Saved My Recovery Phrase
            </Button>
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

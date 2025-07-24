'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { decryptWallet, getRandomWordsForVerification, verifyMnemonicWords, getChecksumAddress, WalletData } from '@/lib/wallet';
import { getEncryptedWallet, getStoredWalletList, setCurrentWalletAddress, removeStoredWallet } from '@/lib/multi-wallet-storage';
import { getAuthChallenge, verifySignature } from '@/lib/storage';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet } from 'ethers';

type LoginStep = 'wallet-select' | 'password' | 'mnemonic-verify' | 'complete';

export default function LoginFlow() {
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
  const [availableWallets, setAvailableWallets] = useState<Array<{ address: string; customId: string }>>([]);

  // Initialize available wallets on component mount
  useEffect(() => {
    const wallets = getStoredWalletList();
    setAvailableWallets(wallets);

    // If only one wallet, skip selection step
    if (wallets.length === 1) {
      setSelectedWalletAddress(wallets[0].address);
      setCurrentStep('password');
    } else if (wallets.length === 0) {
      // No wallets found, redirect to import
      router.push('/import');
    }
  }, [router]);

  const handleWalletSelect = (address: string) => {
    setSelectedWalletAddress(address);
    setCurrentWalletAddress(address);
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
        setAvailableWallets(updatedWallets);

        // If no wallets left, redirect to import
        if (updatedWallets.length === 0) {
          router.push('/import');
        } else if (updatedWallets.length === 1) {
          // If only one wallet left, auto-select it
          setSelectedWalletAddress(updatedWallets[0].address);
          setCurrentStep('password');
        }

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

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      // Get encrypted wallet from storage for the selected address
      const encryptedWallet = getEncryptedWallet(selectedWalletAddress);
      if (!encryptedWallet) {
        setError('Selected wallet not found. Please try selecting a different identity.');
        return;
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

  const handleMnemonicVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Create verification array with user inputs
    const userWords = verificationWords.map((word, index) => ({
      index: word.index,
      word: userVerificationInputs[index]?.trim().toLowerCase() || ''
    }));

    // Verify the words
    if (!walletData || !verifyMnemonicWords(walletData.mnemonic, userWords)) {
      setError('Verification failed. Please check the words and try again.');
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

  const renderWalletSelect = () => (
    <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Select Identity to Login</h2>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
        <p className="text-blue-300 text-sm">
          🔐 Choose which signing identity you want to access. Hover over an identity to see the delete option.
        </p>
      </div>

      <div className="space-y-3">
        {availableWallets.map((wallet) => (
          <div
            key={wallet.address}
            className="relative group"
          >
            <button
              onClick={() => handleWalletSelect(wallet.address)}
              className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg transition-all duration-200 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-white font-semibold">{wallet.customId}</p>
                  <p className="text-gray-400 text-sm font-mono">{getChecksumAddress(wallet.address)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleDeleteWallet(wallet.address, wallet.customId, e)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title={`Delete ${wallet.customId}`}
                  >
                    🗑️
                  </button>
                  <div className="text-purple-400">
                    →
                  </div>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Don&apos;t see your identity?{' '}
          <button
            onClick={() => router.push('/import')}
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            Import it here
          </button>
        </p>
      </div>
    </div>
  );

  const renderPasswordStep = () => (
    <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Welcome Back to SignTusk</h2>

      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
            placeholder="Enter your password"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Password to decrypt your wallet
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-blue-300 text-sm">
            🔒 For security, mnemonic verification is required for all logins.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
            <p className="mb-2">{error}</p>
            {error.includes('No wallet found') && (
              <button
                onClick={() => router.push('/import')}
                className="text-blue-300 hover:text-blue-200 underline text-sm"
              >
                Import Existing Identity →
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? 'Unlocking Wallet...' : 'Unlock Wallet'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Don&apos;t have a wallet?{' '}
          <button
            onClick={() => router.push('/signup')}
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            Create one here
          </button>
        </p>
      </div>
    </div>
  );

  const renderMnemonicVerify = () => (
    <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Security Verification</h2>

      <p className="text-gray-300 mb-6 text-center">
        For your security, please enter the following words from your recovery phrase to complete login.
      </p>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
        <p className="text-blue-300 text-sm">
          📝 Verifying {verificationWords.length} out of {walletData?.mnemonic.split(' ').length} words from your recovery phrase.
        </p>
      </div>

      <form onSubmit={handleMnemonicVerification} className="space-y-4">
        {verificationWords.map((wordData, index) => (
          <div key={index}>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Word #{wordData.index}
            </label>
            <input
              type="text"
              value={userVerificationInputs[index] || ''}
              onChange={(e) => {
                const newInputs = [...userVerificationInputs];
                newInputs[index] = e.target.value;
                setUserVerificationInputs(newInputs);
              }}
              className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
              placeholder={`Enter word #${wordData.index}`}
              required
            />
          </div>
        ))}

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setCurrentStep('password')}
            className="flex-1 bg-white/10 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? 'Verifying...' : 'Verify & Login'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderComplete = () => (
    <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 text-center">
      <div className="text-green-400 text-6xl mb-4">✅</div>
      <h2 className="text-2xl font-bold mb-4 text-white">Welcome Back!</h2>

      <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
        <p className="text-sm text-gray-400 mb-2">Your Signer ID:</p>
        <p className="font-mono text-lg text-purple-400 mb-3">{walletData?.customId}</p>
        <p className="text-sm text-gray-400 mb-2">Your Ethereum Address:</p>
        <p className="font-mono text-sm break-all text-gray-300">{walletData ? getChecksumAddress(walletData.address) : ''}</p>
      </div>

      <p className="text-gray-300 mb-6">
        Your wallet has been successfully authenticated. You can now sign documents securely on the blockchain.
      </p>

      <button
        onClick={async () => {
          // Wait a moment to ensure cookie is properly set and authentication state is updated
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Use Next.js router instead of window.location.href to preserve cookies
          router.push('/dashboard');
        }}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
      >
        Go to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      {currentStep === 'wallet-select' && renderWalletSelect()}
      {currentStep === 'password' && renderPasswordStep()}
      {currentStep === 'mnemonic-verify' && renderMnemonicVerify()}
      {currentStep === 'complete' && renderComplete()}
    </div>
  );
}
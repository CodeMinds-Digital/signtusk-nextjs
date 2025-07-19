'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { decryptWallet, getRandomWordsForVerification, verifyMnemonicWords, WalletData } from '@/lib/wallet';
import { getEncryptedWallet, storeSession } from '@/lib/storage';
import { useWallet } from '@/contexts/WalletContext';

type LoginStep = 'password' | 'mnemonic-verify' | 'complete';

export default function LoginFlow() {
  const { setWallet } = useWallet();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<LoginStep>('password');
  const [password, setPassword] = useState('');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [verificationWords, setVerificationWords] = useState<Array<{index: number, word: string}>>([]);
  const [userVerificationInputs, setUserVerificationInputs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      // Get encrypted wallet from storage
      const encryptedWallet = getEncryptedWallet();
      if (!encryptedWallet) {
        setError('No wallet found. Please create a new wallet.');
        return;
      }

      // Decrypt wallet
      const decryptedWallet = decryptWallet(encryptedWallet, password);
      setWalletData(decryptedWallet);

      // Always require mnemonic verification for security
      const randomWords = getRandomWordsForVerification(decryptedWallet.mnemonic, 3);
      setVerificationWords(randomWords);
      setUserVerificationInputs(new Array(3).fill(''));
      setCurrentStep('mnemonic-verify');
    } catch {
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

    await completeLogin(walletData);
  };

  const completeLogin = async (wallet: WalletData) => {
    setIsLoading(true);
    try {
      // Create session
      storeSession(wallet.address);
      
      // Set wallet in context
      setWallet(wallet);
      
      setCurrentStep('complete');
    } catch {
      setError('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

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
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-blue-300 text-sm">
            🔒 For security, mnemonic verification is required for all logins.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
            {error}
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? 'Verifying...' : 'Verify & Login'}
        </button>
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
        <p className="font-mono text-sm break-all text-gray-300">{walletData?.address}</p>
      </div>

      <p className="text-gray-300 mb-6">
        Your wallet has been successfully unlocked. You can now sign documents securely on the blockchain.
      </p>

      <button
        onClick={() => router.push('/dashboard')}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
      >
        Go to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      {currentStep === 'password' && renderPasswordStep()}
      {currentStep === 'mnemonic-verify' && renderMnemonicVerify()}
      {currentStep === 'complete' && renderComplete()}
    </div>
  );
}
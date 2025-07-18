'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateWallet, encryptWallet, getRandomWordsForVerification, verifyMnemonicWords } from '@/lib/wallet';
import { storeEncryptedWallet, storeSession } from '@/lib/storage';
import { useWallet } from '@/contexts/WalletContext';

type SignupStep = 'password' | 'mnemonic-display' | 'mnemonic-verify' | 'complete';

export default function SignupFlow() {
  const { setWallet } = useWallet();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<SignupStep>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletData, setWalletData] = useState<any>(null);
  const [mnemonicWordCount, setMnemonicWordCount] = useState<12 | 24>(12);
  const [verificationWords, setVerificationWords] = useState<Array<{index: number, word: string}>>([]);
  const [userVerificationInputs, setUserVerificationInputs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string): boolean => {
    return pwd.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Generate new wallet
      const newWallet = generateWallet(mnemonicWordCount);
      setWalletData(newWallet);
      setCurrentStep('mnemonic-display');
    } catch (err) {
      setError('Failed to generate signing identity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMnemonicConfirm = () => {
    // Generate random words for verification
    const randomWords = getRandomWordsForVerification(walletData.mnemonic, 3);
    setVerificationWords(randomWords);
    setUserVerificationInputs(new Array(3).fill(''));
    setCurrentStep('mnemonic-verify');
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Create verification array with user inputs
    const userWords = verificationWords.map((word, index) => ({
      index: word.index,
      word: userVerificationInputs[index]?.trim().toLowerCase() || ''
    }));

    // Verify the words
    if (!verifyMnemonicWords(walletData.mnemonic, userWords)) {
      setError('Verification failed. Please check the words and try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Encrypt and store wallet
      const encryptedWallet = encryptWallet(walletData, password);
      storeEncryptedWallet(encryptedWallet);
      
      // Create session
      storeSession(walletData.address);
      
      // Set wallet in context
      setWallet(walletData);
      
      setCurrentStep('complete');
    } catch (err) {
      setError('Failed to save signing identity');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const renderPasswordStep = () => (
    <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Create Your Signing Identity</h2>
      
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Recovery Phrase Length</label>
          <select
            value={mnemonicWordCount}
            onChange={(e) => setMnemonicWordCount(Number(e.target.value) as 12 | 24)}
            className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
          >
            <option value={12}>12 words (recommended)</option>
            <option value={24}>24 words (more secure)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
            placeholder="Enter a strong password"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            At least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
            placeholder="Confirm your password"
            required
          />
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
          {isLoading ? 'Creating Identity...' : 'Create Signing Identity'}
        </button>
      </form>
    </div>
  );

  const renderMnemonicDisplay = () => (
    <div className="max-w-2xl mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Your Recovery Phrase</h2>
      
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-2">
          <span className="text-yellow-400 font-semibold">⚠️ Critical:</span>
        </div>
        <ul className="text-sm text-yellow-300 space-y-1">
          <li>• Write down these words in order and store them safely</li>
          <li>• Never share your recovery phrase with anyone</li>
          <li>• This is the only way to recover your signing identity</li>
          <li>• If you lose this phrase, your identity cannot be recovered</li>
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
        {walletData.mnemonic.split(' ').map((word: string, index: number) => (
          <div key={index} className="flex items-center space-x-2 p-2 bg-white/10 rounded border border-white/20">
            <span className="text-xs text-gray-400 w-6">{index + 1}.</span>
            <span className="font-mono text-gray-300">{word}</span>
          </div>
        ))}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => copyToClipboard(walletData.mnemonic)}
          className="flex-1 bg-white/10 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
        >
          Copy to Clipboard
        </button>
        <button
          onClick={handleMnemonicConfirm}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
        >
          I've Saved It Securely
        </button>
      </div>
    </div>
  );

  const renderMnemonicVerify = () => (
    <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Verify Your Recovery Phrase</h2>
      
      <p className="text-gray-300 mb-6 text-center">
        Please enter the following words from your recovery phrase to confirm you've saved it correctly.
      </p>

      <form onSubmit={handleVerificationSubmit} className="space-y-4">
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
            onClick={() => setCurrentStep('mnemonic-display')}
            className="flex-1 bg-white/10 backdrop-blur-sm text-white p-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? 'Verifying...' : 'Verify & Complete'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderComplete = () => (
    <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 text-center">
      <div className="text-green-400 text-6xl mb-4">✅</div>
      <h2 className="text-2xl font-bold mb-4 text-white">Signing Identity Created!</h2>
      
      <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
        <p className="text-sm text-gray-400 mb-2">Your Signer ID:</p>
        <p className="font-mono text-lg text-purple-400 mb-3">{walletData.customId}</p>
        <p className="text-sm text-gray-400 mb-2">Your Signing Address:</p>
        <p className="font-mono text-sm break-all text-gray-300">{walletData.address}</p>
      </div>

      <p className="text-gray-300 mb-6">
        Your signing identity has been created and encrypted with your password. You can now sign documents securely on the blockchain.
      </p>

      <button
        onClick={() => router.push('/dashboard')}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
      >
        Continue to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      {currentStep === 'password' && renderPasswordStep()}
      {currentStep === 'mnemonic-display' && renderMnemonicDisplay()}
      {currentStep === 'mnemonic-verify' && renderMnemonicVerify()}
      {currentStep === 'complete' && renderComplete()}
    </div>
  );
}
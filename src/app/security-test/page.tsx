'use client';

import React, { useState } from 'react';
import { generateWalletWithUniqueId } from '@/lib/wallet';
import { createSecureWallet, retrieveSecureWallet, getSecurityStatistics, initializeSecurityManager } from '@/lib/security-manager';
import SecurityDashboard from '@/components/SecurityDashboard';
import SecurityLevelSelector from '@/components/SecurityLevelSelector';
import { SecurityLevel } from '@/lib/security-manager';

export default function SecurityTestPage() {
  const [testWallet, setTestWallet] = useState<any>(null);
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('maximum');
  const [carrierImage, setCarrierImage] = useState<File | undefined>();
  const [password, setPassword] = useState('TestPassword123!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResults, setTestResults] = useState<any>(null);

  React.useEffect(() => {
    initializeSecurityManager();
  }, []);

  const handleCreateTestWallet = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Generate a test wallet with unique ID
      const wallet = await generateWalletWithUniqueId();
      setTestWallet(wallet);

      // Create wallet with selected security level
      const startTime = Date.now();
      await createSecureWallet(wallet, password, {
        level: securityLevel,
        carrierImage: carrierImage
      });
      const createTime = Date.now() - startTime;

      setSuccess(`Test wallet created successfully with ${securityLevel} security in ${createTime}ms`);

      // Test retrieval
      const retrieveStartTime = Date.now();
      const retrievedWallet = await retrieveSecureWallet(wallet.address, password);
      const retrieveTime = Date.now() - retrieveStartTime;

      // Verify data integrity
      const isValid = (
        retrievedWallet.address === wallet.address &&
        retrievedWallet.privateKey === wallet.privateKey &&
        retrievedWallet.mnemonic === wallet.mnemonic &&
        retrievedWallet.customId === wallet.customId
      );

      setTestResults({
        createTime,
        retrieveTime,
        isValid,
        securityLevel,
        hasCarrierImage: !!carrierImage,
        walletAddress: wallet.address
      });

    } catch (error) {
      console.error('Test failed:', error);
      setError(error instanceof Error ? error.message : 'Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestRetrieval = async () => {
    if (!testWallet) {
      setError('No test wallet available. Create one first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const startTime = Date.now();
      const retrievedWallet = await retrieveSecureWallet(testWallet.address, password);
      const retrieveTime = Date.now() - startTime;

      // Verify data integrity
      const isValid = (
        retrievedWallet.address === testWallet.address &&
        retrievedWallet.privateKey === testWallet.privateKey &&
        retrievedWallet.mnemonic === testWallet.mnemonic &&
        retrievedWallet.customId === testWallet.customId
      );

      if (isValid) {
        setSuccess(`Wallet retrieved successfully in ${retrieveTime}ms. Data integrity verified.`);
      } else {
        setError('Data integrity check failed! Retrieved wallet data does not match original.');
      }

    } catch (error) {
      console.error('Retrieval test failed:', error);
      setError(error instanceof Error ? error.message : 'Retrieval test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTestResults = () => {
    if (!testResults) return null;

    return (
      <div className="bg-gray-800/50 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Test Results</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-400">Security Level</div>
            <div className="text-white font-medium">{testResults.securityLevel}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Data Integrity</div>
            <div className={testResults.isValid ? 'text-green-400' : 'text-red-400'}>
              {testResults.isValid ? 'Valid ✓' : 'Invalid ✗'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Creation Time</div>
            <div className="text-white">{testResults.createTime}ms</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Retrieval Time</div>
            <div className="text-white">{testResults.retrieveTime}ms</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Carrier Image</div>
            <div className="text-white">{testResults.hasCarrierImage ? 'Custom' : 'Default'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Wallet Address</div>
            <div className="text-white text-xs font-mono">{testResults.walletAddress}</div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={handleTestRetrieval}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Test Retrieval Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Zero Trust Security Test</h1>
          <p className="text-gray-300">
            Test the Maximum (v3) security implementation with combined encryption and steganography
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Controls */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Security Test Controls</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Test Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    placeholder="Enter test password"
                  />
                </div>

                <SecurityLevelSelector
                  selectedLevel={securityLevel}
                  onLevelChange={setSecurityLevel}
                  onCarrierImageChange={setCarrierImage}
                  disabled={isLoading}
                />

                <div className="space-y-3">
                  <button
                    onClick={handleCreateTestWallet}
                    disabled={isLoading || !password}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create Test Wallet'}
                  </button>

                  {testWallet && (
                    <button
                      onClick={handleTestRetrieval}
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Testing...' : 'Test Wallet Retrieval'}
                    </button>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
                    {success}
                  </div>
                )}
              </div>

              {renderTestResults()}
            </div>
          </div>

          {/* Security Dashboard */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <SecurityDashboard walletAddress={testWallet?.address} />
          </div>
        </div>

        {/* Security Statistics */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Security Implementation Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Enhanced Encryption</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• AES-GCM authenticated encryption</li>
                <li>• PBKDF2 with 310,000 iterations</li>
                <li>• Web Crypto API hardware acceleration</li>
                <li>• Separate encryption for mnemonic and private key</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Steganography</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• LSB (Least Significant Bit) technique</li>
                <li>• Random padding for statistical protection</li>
                <li>• IndexedDB storage for stego images</li>
                <li>• Separate stego keys in localStorage</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Zero Trust Features</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Multi-layer key derivation</li>
                <li>• Defense in depth security model</li>
                <li>• Client-side data processing</li>
                <li>• Backward compatibility with v1/v2</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

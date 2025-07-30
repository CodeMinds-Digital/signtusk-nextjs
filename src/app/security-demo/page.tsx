'use client';

import React, { useState } from 'react';
import { generateWalletWithUniqueId } from '@/lib/wallet';
import { createSecureWallet, getSecurityStatistics } from '@/lib/security-manager';
import { SecurityLevel } from '@/lib/security-manager';

export default function SecurityDemoPage() {
  const [demoResults, setDemoResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  const runSecurityDemo = async () => {
    setIsRunning(true);
    setDemoResults([]);
    const results: any[] = [];
    const password = 'DemoPassword123!';

    const securityLevels: SecurityLevel[] = ['standard', 'enhanced', 'maximum'];

    for (const level of securityLevels) {
      setCurrentTest(`Testing ${level} security...`);

      try {
        // Generate a test wallet with unique ID
        const wallet = await generateWalletWithUniqueId();

        // Measure creation time
        const startTime = Date.now();
        await createSecureWallet(wallet, password, { level });
        const createTime = Date.now() - startTime;

        results.push({
          level,
          success: true,
          createTime,
          walletAddress: wallet.address,
          customId: wallet.customId,
          features: getSecurityFeatures(level)
        });

      } catch (error) {
        results.push({
          level,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          features: getSecurityFeatures(level)
        });
      }

      setDemoResults([...results]);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setCurrentTest('');
    setIsRunning(false);
  };

  const getSecurityFeatures = (level: SecurityLevel) => {
    switch (level) {
      case 'standard':
        return [
          'AES-256 encryption',
          'PBKDF2 key derivation',
          'Local storage',
          'Basic password protection'
        ];
      case 'enhanced':
        return [
          'AES-GCM authenticated encryption',
          'PBKDF2 with 310k iterations',
          'Web Crypto API',
          'Hardware acceleration',
          'Integrity protection'
        ];
      case 'maximum':
        return [
          'Enhanced encryption',
          'LSB steganography',
          'Multi-layer protection',
          'Defense in depth',
          'Data hiding in images',
          'Random padding protection'
        ];
      default:
        return [];
    }
  };

  const getSecurityColor = (level: SecurityLevel) => {
    switch (level) {
      case 'standard': return 'text-yellow-400 bg-yellow-500/20';
      case 'enhanced': return 'text-blue-400 bg-blue-500/20';
      case 'maximum': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSecurityRating = (level: SecurityLevel) => {
    switch (level) {
      case 'standard': return { rating: 3, text: 'Standard' };
      case 'enhanced': return { rating: 4, text: 'High' };
      case 'maximum': return { rating: 5, text: 'Maximum' };
      default: return { rating: 1, text: 'Unknown' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Zero Trust Security Demo</h1>
          <p className="text-gray-300 text-lg">
            Compare the three security levels available in SignTusk
          </p>
        </div>

        {/* Demo Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Security Level Comparison</h2>
            <p className="text-gray-300 mb-6">
              This demo creates test wallets using each security level to show the differences in
              processing time, features, and protection levels.
            </p>

            <button
              onClick={runSecurityDemo}
              disabled={isRunning}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? 'Running Demo...' : 'Run Security Demo'}
            </button>

            {currentTest && (
              <div className="mt-4 text-blue-300">
                {currentTest}
              </div>
            )}
          </div>
        </div>

        {/* Demo Results */}
        {demoResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {demoResults.map((result, index) => {
              const securityRating = getSecurityRating(result.level);

              return (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
                  <div className="text-center mb-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSecurityColor(result.level)}`}>
                      {result.level.charAt(0).toUpperCase() + result.level.slice(1)} Security
                    </div>
                  </div>

                  {result.success ? (
                    <div className="space-y-4">
                      {/* Performance Metrics */}
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">Performance</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Creation Time:</span>
                            <span className="text-white">{result.createTime}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Security Rating:</span>
                            <span className={`font-medium ${getSecurityColor(result.level).split(' ')[0]}`}>
                              {securityRating.text} ({securityRating.rating}/5)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">Features</h4>
                        <ul className="space-y-1 text-sm">
                          {result.features.map((feature: string, idx: number) => (
                            <li key={idx} className="flex items-center text-gray-300">
                              <span className="text-green-400 mr-2">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Wallet Info */}
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">Test Wallet</h4>
                        <div className="space-y-1 text-xs">
                          <div className="text-gray-400">ID: {result.customId}</div>
                          <div className="text-gray-400 font-mono break-all">
                            {result.walletAddress}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-red-400 text-4xl mb-2">❌</div>
                      <div className="text-red-300 text-sm">
                        Failed: {result.error}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Security Comparison Table */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">Security Level Comparison</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">Feature</th>
                  <th className="text-center py-3 px-4 text-yellow-400">Standard (v1)</th>
                  <th className="text-center py-3 px-4 text-blue-400">Enhanced (v2)</th>
                  <th className="text-center py-3 px-4 text-green-400">Maximum (v3)</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-800">
                  <td className="py-3 px-4">Encryption Algorithm</td>
                  <td className="text-center py-3 px-4">AES-256</td>
                  <td className="text-center py-3 px-4">AES-GCM</td>
                  <td className="text-center py-3 px-4">AES-GCM</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-3 px-4">Key Derivation</td>
                  <td className="text-center py-3 px-4">PBKDF2</td>
                  <td className="text-center py-3 px-4">PBKDF2 (310k)</td>
                  <td className="text-center py-3 px-4">PBKDF2 (310k)</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-3 px-4">Steganography</td>
                  <td className="text-center py-3 px-4">❌</td>
                  <td className="text-center py-3 px-4">❌</td>
                  <td className="text-center py-3 px-4">✅ LSB</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-3 px-4">Hardware Acceleration</td>
                  <td className="text-center py-3 px-4">❌</td>
                  <td className="text-center py-3 px-4">✅</td>
                  <td className="text-center py-3 px-4">✅</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-3 px-4">Integrity Protection</td>
                  <td className="text-center py-3 px-4">❌</td>
                  <td className="text-center py-3 px-4">✅</td>
                  <td className="text-center py-3 px-4">✅</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-3 px-4">Processing Time</td>
                  <td className="text-center py-3 px-4">&lt; 1s</td>
                  <td className="text-center py-3 px-4">2-5s</td>
                  <td className="text-center py-3 px-4">5-15s</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Security Rating</td>
                  <td className="text-center py-3 px-4">3/5</td>
                  <td className="text-center py-3 px-4">4/5</td>
                  <td className="text-center py-3 px-4">5/5</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <div className="space-x-4">
            <a
              href="/security-test"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Advanced Testing
            </a>
            <a
              href="/signup"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Create Secure Wallet
            </a>
            <a
              href="/login"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Login to Existing Wallet
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

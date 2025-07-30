'use client';

import React, { useState } from 'react';
import { generateWallet, generateWalletWithUniqueId, generateCustomId } from '@/lib/wallet';

export default function TestWalletGenerationPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results: any[] = [];

    try {
      // Test 1: Basic wallet generation
      console.log('Testing basic wallet generation...');
      const basicWallet = generateWallet(12);
      results.push({
        test: 'Basic Wallet Generation (12 words)',
        success: true,
        data: {
          customId: basicWallet.customId,
          customIdLength: basicWallet.customId.length,
          mnemonicWords: basicWallet.mnemonic.split(' '),
          mnemonicWordCount: basicWallet.mnemonic.split(' ').length,
          address: basicWallet.address,
          privateKeyLength: basicWallet.privateKey.length
        }
      });

      // Test 2: 24-word wallet generation
      console.log('Testing 24-word wallet generation...');
      const wallet24 = generateWallet(24);
      results.push({
        test: 'Basic Wallet Generation (24 words)',
        success: true,
        data: {
          customId: wallet24.customId,
          customIdLength: wallet24.customId.length,
          mnemonicWords: wallet24.mnemonic.split(' '),
          mnemonicWordCount: wallet24.mnemonic.split(' ').length,
          address: wallet24.address,
          privateKeyLength: wallet24.privateKey.length
        }
      });

      // Test 3: Custom ID generation
      console.log('Testing custom ID generation...');
      const customIds = [];
      for (let i = 0; i < 5; i++) {
        customIds.push(generateCustomId());
      }
      results.push({
        test: 'Custom ID Generation (5 samples)',
        success: true,
        data: {
          customIds,
          lengths: customIds.map(id => id.length),
          allUnique: new Set(customIds).size === customIds.length
        }
      });

      // Test 4: Unique wallet generation (with API call)
      console.log('Testing unique wallet generation...');
      try {
        const uniqueWallet = await generateWalletWithUniqueId(12);
        results.push({
          test: 'Unique Wallet Generation',
          success: true,
          data: {
            customId: uniqueWallet.customId,
            customIdLength: uniqueWallet.customId.length,
            mnemonicWords: uniqueWallet.mnemonic.split(' '),
            mnemonicWordCount: uniqueWallet.mnemonic.split(' ').length,
            address: uniqueWallet.address
          }
        });
      } catch (error) {
        results.push({
          test: 'Unique Wallet Generation',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 5: Mnemonic word validation
      console.log('Testing mnemonic word validation...');
      const testWallet = generateWallet(12);
      const words = testWallet.mnemonic.split(' ');
      const uniqueWords = new Set(words);
      const startsWithSameLetter = words.every(word => word.charAt(0) === words[0].charAt(0));
      
      results.push({
        test: 'Mnemonic Word Validation',
        success: true,
        data: {
          totalWords: words.length,
          uniqueWords: uniqueWords.size,
          allWordsUnique: uniqueWords.size === words.length,
          startsWithSameLetter: startsWithSameLetter,
          firstFewWords: words.slice(0, 6),
          mnemonic: testWallet.mnemonic
        }
      });

    } catch (error) {
      results.push({
        test: 'General Error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Wallet Generation Test</h1>
          <p className="text-gray-300 text-lg">
            Test wallet generation, custom ID creation, and mnemonic phrase validation
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mb-8">
          <div className="text-center">
            <button
              onClick={runTests}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Running Tests...' : 'Run Wallet Generation Tests'}
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-6">
            {testResults.map((result, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">{result.test}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {result.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </div>

                {result.success && result.data && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}

                {!result.success && result.error && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-300 text-sm">{result.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <div className="space-x-4">
            <a
              href="/signup"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Test Signup Flow
            </a>
            <a
              href="/security-demo"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Security Demo
            </a>
            <a
              href="/login"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Login Flow
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

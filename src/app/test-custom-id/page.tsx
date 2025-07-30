'use client';

import React, { useState } from 'react';
import { generateCustomId, generateWalletWithUniqueId } from '@/lib/wallet';

export default function TestCustomIdPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testCustomIdFlow = async () => {
    setIsLoading(true);
    const results: any[] = [];

    try {
      // Test 1: Generate Custom ID
      console.log('Step 1: Generating Custom ID...');
      const customId = generateCustomId();
      results.push({
        step: 'Generate Custom ID',
        success: true,
        data: {
          customId,
          length: customId.length,
          format: 'Should be 18 characters'
        }
      });

      // Test 2: Check Custom ID uniqueness
      console.log('Step 2: Checking Custom ID uniqueness...');
      try {
        const response = await fetch('/api/wallet/check-custom-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ custom_id: customId })
        });
        
        const uniqueResult = await response.json();
        results.push({
          step: 'Check Custom ID Uniqueness',
          success: response.ok,
          data: uniqueResult
        });
      } catch (error) {
        results.push({
          step: 'Check Custom ID Uniqueness',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 3: Generate wallet with unique ID
      console.log('Step 3: Generating wallet with unique ID...');
      try {
        const wallet = await generateWalletWithUniqueId(12);
        results.push({
          step: 'Generate Wallet with Unique ID',
          success: true,
          data: {
            customId: wallet.customId,
            customIdLength: wallet.customId.length,
            address: wallet.address,
            mnemonicWordCount: wallet.mnemonic.split(' ').length
          }
        });

        // Test 4: Test wallet creation API directly
        console.log('Step 4: Testing wallet creation API...');
        try {
          const apiResponse = await fetch('/api/wallet/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              wallet_address: wallet.address,
              encrypted_private_key: 'test-encrypted-key',
              custom_id: wallet.customId
            })
          });

          if (apiResponse.ok) {
            const apiResult = await apiResponse.json();
            results.push({
              step: 'Wallet Creation API',
              success: true,
              data: {
                sentCustomId: wallet.customId,
                receivedCustomId: apiResult.custom_id,
                customIdMatches: wallet.customId === apiResult.custom_id,
                apiResult
              }
            });
          } else {
            const error = await apiResponse.json();
            results.push({
              step: 'Wallet Creation API',
              success: false,
              error: error.error || 'API call failed'
            });
          }
        } catch (error) {
          results.push({
            step: 'Wallet Creation API',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      } catch (error) {
        results.push({
          step: 'Generate Wallet with Unique ID',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    } catch (error) {
      results.push({
        step: 'General Error',
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
          <h1 className="text-4xl font-bold text-white mb-4">Custom ID Flow Test</h1>
          <p className="text-gray-300 text-lg">
            Test the complete Custom ID generation and database storage flow
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mb-8">
          <div className="text-center">
            <button
              onClick={testCustomIdFlow}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Running Tests...' : 'Test Custom ID Flow'}
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-6">
            {testResults.map((result, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    Step {index + 1}: {result.step}
                  </h3>
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

        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Expected Results:</h2>
          <ul className="space-y-2 text-gray-300">
            <li>✅ Custom ID should be 18 characters long</li>
            <li>✅ Custom ID uniqueness check should work</li>
            <li>✅ Wallet generation should use 18-character Custom ID</li>
            <li>✅ API should accept and use the provided Custom ID</li>
            <li>✅ Database should store the 18-character Custom ID (not generate its own)</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <div className="space-x-4">
            <a
              href="/signup"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Test Signup Flow
            </a>
            <a
              href="/test-wallet-generation"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Wallet Generation Test
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

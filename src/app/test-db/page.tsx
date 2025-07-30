'use client';

import React, { useState } from 'react';

export default function TestDbPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDatabaseFunctions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/custom-id');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testUserCreation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/custom-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_create_user' })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testWalletCreation = async () => {
    setLoading(true);
    try {
      // Test the actual wallet creation API
      // Generate proper 18-character custom ID
      const timestamp = Date.now().toString();
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const customId = ('TEST' + timestamp + randomSuffix).substring(0, 18).padEnd(18, '0');

      const testWallet = {
        wallet_address: '0x' + Date.now().toString(16).padStart(40, '0'),
        encrypted_private_key: 'test_encrypted_key_' + Date.now(),
        custom_id: customId, // Exactly 18 chars
        encrypted_mnemonic: 'test_mnemonic',
        salt: 'test_salt',
        display_name: 'Test User',
        email: 'test@example.com'
      };

      console.log('Testing wallet creation with:', testWallet);

      const response = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testWallet)
      });

      const data = await response.json();
      setResults({
        success: response.ok,
        status: response.status,
        testWallet,
        response: data
      });
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testAvatarGeneration = async () => {
    setLoading(true);
    try {
      const testSeed = 'test-wallet-' + Date.now();

      const response = await fetch('/api/test/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: testSeed, size: 256 })
      });

      const data = await response.json();
      setResults({
        success: response.ok,
        avatarTest: true,
        seed: testSeed,
        response: data
      });
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Database Function Test</h1>

        <div className="space-y-4 mb-8">
          <button
            onClick={testDatabaseFunctions}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Database Functions'}
          </button>

          <button
            onClick={testUserCreation}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test User Creation'}
          </button>

          <button
            onClick={testWalletCreation}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test Wallet API'}
          </button>

          <button
            onClick={testAvatarGeneration}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test Avatar Generation'}
          </button>

          <a
            href="/test-stego"
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg ml-4 inline-block"
          >
            🎨 View Steganography Images
          </a>
        </div>

        {results && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Test Results:</h2>
            <pre className="text-sm text-gray-300 overflow-auto bg-black/20 p-4 rounded-lg">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Expected Results:</h2>
          <ul className="space-y-2 text-gray-300">
            <li>✅ generate_custom_id should return 18-character string</li>
            <li>✅ create_user_with_wallet should work without errors</li>
            <li>✅ get_user_by_wallet_address should work without errors</li>
            <li>✅ All functions should exist and be callable</li>
            <li>✅ Avatar generation should create unique PNG images</li>
            <li>✅ Steganography should work with generated avatars</li>
          </ul>
        </div>

        {results && results.response && results.response.image && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Generated Avatar:</h2>
            <img
              src={results.response.image}
              alt="Generated Avatar"
              className="w-64 h-64 rounded-lg border border-white/20"
            />
            <p className="text-gray-300 mt-2">Seed: {results.seed}</p>
            <p className="text-gray-300">Size: {results.response.size} bytes</p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';

export default function AuthTestPage() {
  const { isAuthenticated, currentUser, isLoading, hasWallet } = useWallet();
  const [authCheck, setAuthCheck] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    // Check auth endpoint directly
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        const data = await response.json();
        setAuthCheck({ status: response.status, data });
      } catch (error) {
        setAuthCheck({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    // Get cookies
    if (typeof window !== 'undefined') {
      setCookies(document.cookie);
    }

    checkAuth();
  }, []);

  const createTestAuth = async () => {
    try {
      // Create a test auth token
      const response = await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: '0x1234567890123456789012345678901234567890' }),
        credentials: 'include'
      });
      const data = await response.json();
      console.log('Test auth created:', data);

      // Refresh the page to see changes
      window.location.reload();
    } catch (error) {
      console.error('Error creating test auth:', error);
    }
  };

  const clearAuth = async () => {
    try {
      const response = await fetch('/api/auth/clear', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      console.log('Auth cleared:', data);

      // Refresh the page to see changes
      window.location.reload();
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Authentication Test Page</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wallet Context State */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Wallet Context State</h2>
            <div className="space-y-2 text-gray-300">
              <div>Loading: <span className="text-white">{isLoading ? 'Yes' : 'No'}</span></div>
              <div>Authenticated: <span className="text-white">{isAuthenticated ? 'Yes' : 'No'}</span></div>
              <div>Has Wallet: <span className="text-white">{hasWallet ? 'Yes' : 'No'}</span></div>
              <div>Current User: <span className="text-white">{currentUser ? JSON.stringify(currentUser, null, 2) : 'None'}</span></div>
            </div>
          </div>

          {/* API Response */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">API Auth Check</h2>
            <div className="space-y-2 text-gray-300">
              <div>Response: <pre className="text-white text-xs">{authCheck ? JSON.stringify(authCheck, null, 2) : 'Loading...'}</pre></div>
            </div>
          </div>

          {/* Cookies */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Browser Cookies</h2>
            <div className="text-gray-300">
              <pre className="text-white text-xs">{cookies || 'No cookies found'}</pre>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Test Actions</h2>
            <div className="space-y-3">
              <button
                onClick={createTestAuth}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Create Test Authentication
              </button>
              <button
                onClick={clearAuth}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Clear Authentication
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>

        {/* Expected Behavior */}
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Expected Behavior</h2>
          <div className="text-yellow-200 space-y-2">
            <p>1. If "Authenticated" is "Yes", the homepage should show "Welcome Back" options</p>
            <p>2. If "Authenticated" is "No", the homepage should show normal signup/login options</p>
            <p>3. Use "Create Test Authentication" to simulate a logged-in user</p>
            <p>4. Use "Clear Authentication" to simulate a logged-out user</p>
          </div>
        </div>
      </div>
    </div>
  );
}
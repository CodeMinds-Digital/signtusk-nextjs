'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';

export default function AuthDebug() {
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

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>Has Wallet: {hasWallet ? 'Yes' : 'No'}</div>
        <div>Current User: {currentUser ? JSON.stringify(currentUser) : 'None'}</div>
        <div>Auth Check: {authCheck ? JSON.stringify(authCheck) : 'Loading...'}</div>
        <div>Cookies: {cookies || 'None'}</div>
      </div>
    </div>
  );
}
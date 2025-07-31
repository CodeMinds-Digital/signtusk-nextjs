'use client';

import React from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';

export default function AuthDebugInfo() {
  const { wallet, isAuthenticated, hasWallet, currentUser, isLoading } = useWallet();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm z-50 border border-white/20">
      <h3 className="font-bold mb-2 text-yellow-400">Auth Debug Info</h3>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">isLoading:</span>
          <span className={isLoading ? 'text-yellow-300' : 'text-green-300'}>
            {isLoading ? 'true' : 'false'}
          </span>
        </div>
        <div>
          <span className="text-gray-400">isAuthenticated:</span>
          <span className={isAuthenticated ? 'text-green-300' : 'text-red-300'}>
            {isAuthenticated ? 'true' : 'false'}
          </span>
        </div>
        <div>
          <span className="text-gray-400">hasWallet:</span>
          <span className={hasWallet ? 'text-green-300' : 'text-red-300'}>
            {hasWallet ? 'true' : 'false'}
          </span>
        </div>
        <div>
          <span className="text-gray-400">wallet:</span>
          <span className={wallet ? 'text-green-300' : 'text-red-300'}>
            {wallet ? 'present' : 'null'}
          </span>
        </div>
        <div>
          <span className="text-gray-400">currentUser:</span>
          <span className={currentUser ? 'text-green-300' : 'text-red-300'}>
            {currentUser ? 'present' : 'null'}
          </span>
        </div>
        {currentUser && (
          <div className="text-xs">
            <div>
              <span className="text-gray-400">wallet_address:</span>
              <span className="text-blue-300">{currentUser.wallet_address}</span>
            </div>
            {currentUser.custom_id && (
              <div>
                <span className="text-gray-400">custom_id:</span>
                <span className="text-purple-300">{currentUser.custom_id}</span>
              </div>
            )}
          </div>
        )}
        {wallet && (
          <div className="text-xs">
            <div>
              <span className="text-gray-400">wallet.address:</span>
              <span className="text-blue-300">{wallet.address}</span>
            </div>
            <div>
              <span className="text-gray-400">wallet.customId:</span>
              <span className="text-purple-300">{wallet.customId}</span>
            </div>
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-white/20">
          <span className="text-gray-400">hasValidAuth:</span>
          <span className={isAuthenticated && currentUser && wallet ? 'text-green-300' : 'text-red-300'}>
            {isAuthenticated && currentUser && wallet ? 'true' : 'false'}
          </span>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';

export default function IdentityConsistencyWarning() {
  // @ts-ignore - These properties are added dynamically
  const { identityConsistent, identityIssues, identityErrorMessage, currentUser, wallet } = useWallet();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if identity is consistent or user dismissed the warning
  if (identityConsistent || dismissed || !currentUser || !wallet) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed top-4 right-4 max-w-md bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg z-50">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Signer ID Inconsistency Detected
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-2">{identityErrorMessage}</p>

              <div className="bg-yellow-100 rounded p-2 mb-3">
                <p className="text-xs font-medium mb-1">Details:</p>
                <p className="text-xs">
                  <span className="font-medium">Database Signer ID:</span> {currentUser.custom_id || 'Not found'}
                </p>
                <p className="text-xs">
                  <span className="font-medium">Local Signer ID:</span> {wallet.customId || 'Not found'}
                </p>
              </div>

              <div className="text-xs text-yellow-600">
                <p className="font-medium mb-1">Issues detected:</p>
                <ul className="list-disc list-inside space-y-1">
                  {/* @ts-ignore - identityIssues is added dynamically */}
                  {identityIssues.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleRefresh}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={handleDismiss}
                className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="bg-yellow-50 rounded-md inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
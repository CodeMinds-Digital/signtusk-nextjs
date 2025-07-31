'use client';

import React from 'react';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { VerifyRedesigned } from '@/components/redesigned/VerifyRedesigned';
import { LoadingSpinner } from '@/components/ui/DesignSystem';

export default function VerifyPage() {
  const { wallet, isLoading } = useWallet();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-bold mb-2 text-white mt-4">Loading Verification...</h2>
          <p className="text-neutral-400">Initializing verification system...</p>
        </div>
      </div>
    );
  }

  return <VerifyRedesigned />;
}

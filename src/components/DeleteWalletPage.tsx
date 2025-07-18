'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteWalletPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShouldRedirect(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle redirect in a separate useEffect
  useEffect(() => {
    if (shouldRedirect) {
      router.push('/');
    }
  }, [shouldRedirect, router]);

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-3xl">🗑️</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-4 text-white">Signing Identity Deleted</h2>
        
        <p className="text-gray-300 mb-6 leading-relaxed">
          Your SignTusk signing identity has been permanently deleted from this device. 
          You can restore it anytime using your recovery phrase.
        </p>

        <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
          <p className="text-sm text-gray-400 mb-2">What was deleted:</p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>✓ Local encrypted data</li>
            <li>✓ Session information</li>
            <li>✓ Stored preferences</li>
          </ul>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Remember:</strong> Your recovery phrase can restore your identity on any device.
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-blue-300 text-sm">
            Redirecting to home page in <span className="font-bold text-blue-200">{countdown}</span> seconds...
          </p>
        </div>

        <button
          onClick={handleGoHome}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
        >
          Go to Home Page
        </button>
      </div>
    </div>
  );
}
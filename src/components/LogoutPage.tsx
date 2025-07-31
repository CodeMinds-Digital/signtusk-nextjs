'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext-Updated';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useWallet();
  const [countdown, setCountdown] = useState(3);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Ensure logout is called when this page loads
    logout();

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
  }, [logout]);

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
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-3xl">👋</span>
        </div>

        <h2 className="text-2xl font-bold mb-4 text-white">Successfully Logged Out</h2>

        <p className="text-gray-300 mb-6 leading-relaxed">
          You have been securely logged out of SignTusk. Your signing identity remains encrypted and safe on your device.
        </p>

        <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
          <p className="text-sm text-gray-400 mb-2">Security Features:</p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>✓ Session cleared</li>
            <li>✓ Identity data encrypted</li>
            <li>✓ No data transmitted</li>
          </ul>
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
          Return to Home Now
        </button>
      </div>
    </div>
  );
}
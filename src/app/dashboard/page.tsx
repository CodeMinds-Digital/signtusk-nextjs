'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  const { wallet, isLoading, isAuthenticated, currentUser } = useWallet();
  const router = useRouter();
  const [redirectTimer, setRedirectTimer] = useState<number | null>(null);

  // FIXED: Clear authentication logic - no flickering
  const hasValidAuth = isAuthenticated && currentUser && wallet;

  useEffect(() => {
    // Add a small delay before checking authentication to give auth state time to initialize
    const authCheckDelay = setTimeout(() => {
      // Only redirect if we're sure the user is not authenticated
      if (!isLoading && !hasValidAuth) {
        // Set a timer for redirect to prevent flickering
        const timer = setTimeout(() => {
          router.replace('/');
        }, 3000);

        setRedirectTimer(3);

        // Countdown timer
        const countdown = setInterval(() => {
          setRedirectTimer(prev => {
            if (prev && prev > 1) {
              return prev - 1;
            } else {
              clearInterval(countdown);
              return null;
            }
          });
        }, 1000);

        return () => {
          clearTimeout(timer);
          clearInterval(countdown);
        };
      }
    }, 500); // 500ms delay before checking auth state

    return () => {
      clearTimeout(authCheckDelay);
    };
  }, [hasValidAuth, isLoading, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <span className="text-white text-2xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Loading Dashboard...</h2>
          <p className="text-gray-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show access denied message if no valid authentication
  if (!hasValidAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 max-w-md mx-4">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Authentication Required</h2>
          <p className="text-gray-300 mb-6">
            Please login to access the dashboard. You need a signing identity to use document signing features.
          </p>

          {redirectTimer && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
              <p className="text-yellow-300 text-sm">
                Redirecting to homepage in {redirectTimer} seconds...
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold"
            >
              Go to Homepage
            </button>
            <button
              onClick={() => router.push('/login')}
              className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 font-semibold"
            >
              Login with Existing Identity
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 font-semibold"
            >
              Create New Identity
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard if authenticated
  return <Dashboard />;
}
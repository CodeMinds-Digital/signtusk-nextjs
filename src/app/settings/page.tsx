'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { SettingsRedesigned } from '@/components/redesigned/SettingsRedesigned';
import { LoadingSpinner, SecurityIcons } from '@/components/ui/DesignSystem';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const { wallet, isLoading, isAuthenticated, currentUser } = useWallet();
  const router = useRouter();
  const [redirectTimer, setRedirectTimer] = useState<number | null>(null);

  // FIXED: Clear authentication logic - no flickering
  const hasValidAuth = isAuthenticated && currentUser && wallet;

  useEffect(() => {
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
  }, [hasValidAuth, isLoading, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <Card variant="glass" padding="lg" className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LoadingSpinner size="lg" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Loading Settings...</h2>
          <p className="text-neutral-300">Verifying your secure identity...</p>
        </Card>
      </div>
    );
  }

  // Show access denied message if no valid authentication
  if (!hasValidAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <Card variant="glass" padding="lg" className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-error-500 to-error-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <SecurityIcons.Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Authentication Required</h2>
          <p className="text-neutral-300 mb-6">
            Please sign in to access your settings. You need a verified signing identity to manage your security settings.
          </p>

          {redirectTimer && (
            <Card variant="outline" padding="sm" className="mb-6 border-warning-500/30 bg-warning-500/10">
              <p className="text-warning-300 text-sm">
                Redirecting to homepage in {redirectTimer} seconds...
              </p>
            </Card>
          )}

          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => router.push('/')}
              variant="primary"
              fullWidth
            >
              Go to Homepage
            </Button>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              fullWidth
              icon={<SecurityIcons.Key className="w-4 h-4" />}
            >
              Sign In with Identity
            </Button>
            <Button
              onClick={() => router.push('/signup')}
              variant="ghost"
              fullWidth
              icon={<SecurityIcons.Shield className="w-4 h-4" />}
            >
              Create New Identity
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show settings if authenticated
  return <SettingsRedesigned />;
}

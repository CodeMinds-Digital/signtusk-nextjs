'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext-Updated';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SecurityIcons, LoadingSpinner } from '../ui/DesignSystem';

export const LogoutRedesigned: React.FC = () => {
  const router = useRouter();
  const { logout } = useWallet();
  const [countdown, setCountdown] = useState(5);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(true);

  useEffect(() => {
    // Perform logout
    const performLogout = async () => {
      try {
        await logout();
        setIsLoggingOut(false);
      } catch (error) {
        console.error('Logout error:', error);
        setIsLoggingOut(false);
      }
    };

    performLogout();
  }, [logout]);

  useEffect(() => {
    if (!isLoggingOut) {
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
    }
  }, [isLoggingOut]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push('/');
    }
  }, [shouldRedirect, router]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleSignInAgain = () => {
    router.push('/login');
  };

  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <Card variant="glass" padding="xl" className="text-center max-w-md w-full">
          <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LoadingSpinner size="lg" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">Signing Out...</h2>

          <p className="text-neutral-300 mb-6">
            Securely clearing your session and protecting your identity.
          </p>

          <div className="space-y-2 text-sm text-neutral-400">
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Clearing session data</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Encrypting local data</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Securing identity</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <Card variant="glass" padding="xl" className="text-center max-w-md w-full">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 trust-glow">
          <SecurityIcons.Verified className="w-10 h-10 text-green-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">Successfully Signed Out</h2>

        <p className="text-neutral-300 mb-6 leading-relaxed">
          You have been securely signed out of SignTusk. Your signing identity remains encrypted and protected on your device.
        </p>

        {/* Security Features */}
        <Card variant="outline" padding="md" className="mb-6 border-green-500/30 bg-green-500/10">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <SecurityIcons.Shield className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-medium">Security Confirmed</span>
          </div>
          <div className="space-y-2 text-sm text-green-200">
            <div className="flex items-center justify-center space-x-2">
              <SecurityIcons.Verified className="w-4 h-4" />
              <span>Session cleared securely</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <SecurityIcons.Lock className="w-4 h-4" />
              <span>Identity data encrypted</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <SecurityIcons.Shield className="w-4 h-4" />
              <span>No data transmitted</span>
            </div>
          </div>
        </Card>

        {/* Countdown */}
        <Card variant="outline" padding="md" className="mb-6 border-primary-500/30 bg-primary-500/10">
          <div className="flex items-center justify-center space-x-2">
            <SecurityIcons.Activity className="w-5 h-5 text-primary-400" />
            <span className="text-primary-300 text-sm">
              Redirecting to homepage in <span className="font-bold text-primary-200">{countdown}</span> seconds
            </span>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleGoHome}
            fullWidth
            size="lg"
            icon={<SecurityIcons.Shield className="w-5 h-5" />}
          >
            Return to Homepage
          </Button>

          <Button
            onClick={handleSignInAgain}
            variant="outline"
            fullWidth
            size="lg"
            icon={<SecurityIcons.Key className="w-5 h-5" />}
          >
            Sign In Again
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-neutral-700">
          <p className="text-neutral-400 text-xs">
            Your encrypted identity remains secure on this device. You can sign in again anytime using your password and recovery phrase verification.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LogoutRedesigned;

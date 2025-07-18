'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WalletData } from '@/lib/wallet';
import { getSession, hasStoredWallet, clearSession } from '@/lib/storage';

interface WalletContextType {
  wallet: WalletData | null;
  isAuthenticated: boolean;
  hasWallet: boolean;
  setWallet: (wallet: WalletData | null) => void;
  logout: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [wallet, setWalletState] = useState<WalletData | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if wallet exists in storage
    setHasWallet(hasStoredWallet());
    
    // Check for active session
    const session = getSession();
    if (session) {
      setIsAuthenticated(true);
      // Note: We don't restore the full wallet data from session for security
      // The wallet data should be decrypted again when needed
    }
  }, []);

  const setWallet = (newWallet: WalletData | null) => {
    setWalletState(newWallet);
    setIsAuthenticated(!!newWallet);
  };

  const logout = () => {
    setWalletState(null);
    setIsAuthenticated(false);
    clearSession();
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isAuthenticated,
        hasWallet,
        setWallet,
        logout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
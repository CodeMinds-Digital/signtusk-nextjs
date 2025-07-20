'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WalletData } from '@/lib/wallet';
import { 
  hasStoredWallet,
  migrateFromSingleWallet
} from '@/lib/multi-wallet-storage';
import { 
  getCurrentUser, 
  logout as apiLogout
} from '@/lib/storage';

interface WalletContextType {
  wallet: WalletData | null;
  isAuthenticated: boolean;
  hasWallet: boolean;
  currentUser: { wallet_address: string } | null;
  isLoading: boolean;
  setWallet: (wallet: WalletData | null) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [wallet, setWalletState] = useState<WalletData | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ wallet_address: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(!!user);
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Migrate from old single wallet storage if needed
      migrateFromSingleWallet();
      
      // Check if wallet exists in localStorage
      setHasWallet(hasStoredWallet());
      
      // Check for active session with server
      await refreshAuth();
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const setWallet = (newWallet: WalletData | null) => {
    setWalletState(newWallet);
    // Note: Authentication state is managed separately via server sessions
  };

  const logout = async () => {
    try {
      // Call server logout endpoint
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state but keep the encrypted wallet in localStorage
      setWalletState(null);
      setIsAuthenticated(false);
      setCurrentUser(null);
      // Update hasWallet state to reflect that wallet is still stored
      setHasWallet(hasStoredWallet());
      // DO NOT remove stored wallet - users need it to login again
      // removeStoredWallet(); // This was causing the issue
    }
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isAuthenticated,
        hasWallet,
        currentUser,
        isLoading,
        setWallet,
        logout,
        refreshAuth,
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
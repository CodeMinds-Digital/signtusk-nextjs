'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
  currentUser: { wallet_address: string; custom_id?: string } | null;
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
  const [currentUser, setCurrentUser] = useState<{ wallet_address: string; custom_id?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadWalletFromStorage = useCallback(async () => {
    try {
      // Check if we have a stored wallet
      if (hasStoredWallet()) {
        // The wallet will be loaded when user provides password
        // This just indicates that a wallet exists
        setHasWallet(true);
      }
    } catch (error) {
      console.error('Error loading wallet from storage:', error);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      console.log('Refreshing auth...');
      const user = await getCurrentUser();
      console.log('getCurrentUser result:', user);

      setCurrentUser(user);
      setIsAuthenticated(!!user);

      // If we have a user but no wallet in state, try to load it from storage
      if (user && !wallet) {
        console.log('User found but no wallet in state, loading from storage...');
        await loadWalletFromStorage();
      }
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  }, [wallet, loadWalletFromStorage]);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      try {
        console.log('Initializing auth...');

        // Migrate from old single wallet storage if needed
        migrateFromSingleWallet();

        // Check if wallet exists in localStorage
        const walletExists = hasStoredWallet();
        setHasWallet(walletExists);
        console.log('Wallet exists in storage:', walletExists);

        // Load wallet from storage first
        if (walletExists) {
          await loadWalletFromStorage();
        }

        // Check for active session with server
        await refreshAuth();

      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [refreshAuth, loadWalletFromStorage]);

  const setWallet = (newWallet: WalletData | null) => {
    console.log('Setting wallet:', newWallet?.customId || 'null');
    setWalletState(newWallet);

    // Update authentication state based on wallet presence
    if (newWallet) {
      // Wallet is loaded, but authentication depends on server session
      // The server session should already be established during login
    } else {
      // Wallet is cleared (logout or error)
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const logout = async () => {
    try {
      // Call server logout endpoint to clear session
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state but KEEP the encrypted wallet in localStorage
      setWalletState(null);
      setIsAuthenticated(false);
      setCurrentUser(null);

      // Update hasWallet state - wallet should still be stored for future logins
      setHasWallet(hasStoredWallet());

      // IMPORTANT: DO NOT remove stored wallet
      // The encrypted wallet stays in localStorage so user can login again
      // with the SAME custom_id and wallet_address
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('WalletContext state update:', {
      isLoading,
      isAuthenticated,
      hasWallet,
      walletPresent: !!wallet,
      currentUserPresent: !!currentUser,
      walletCustomId: wallet?.customId,
      currentUserWalletAddress: currentUser?.wallet_address
    });
  }, [isLoading, isAuthenticated, hasWallet, wallet, currentUser]);

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
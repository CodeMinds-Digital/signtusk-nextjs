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
import {
  checkIdentityConsistency,
  logIdentityConsistency,
  getAuthoritativeSignerId,
  createIdentityErrorMessage
} from '@/lib/identity-consistency';

interface WalletContextType {
  wallet: WalletData | null;
  isAuthenticated: boolean;
  hasWallet: boolean;
  currentUser: { wallet_address: string; custom_id?: string } | null;
  isLoading: boolean;
  setWallet: (wallet: WalletData | null) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  getSignerId: () => string | null;
  identityConsistent: boolean;
  identityIssues: string[];
  identityErrorMessage: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

// Session storage key for temporary wallet storage
const SESSION_WALLET_KEY = 'session_wallet_data';

export function WalletProvider({ children }: WalletProviderProps) {
  const [wallet, setWalletState] = useState<WalletData | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ wallet_address: string; custom_id?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [identityConsistent, setIdentityConsistent] = useState(true);
  const [identityIssues, setIdentityIssues] = useState<string[]>([]);
  const [identityErrorMessage, setIdentityErrorMessage] = useState('');

  // Store wallet in session storage for persistence across page navigations
  const storeWalletInSession = (walletData: WalletData | null) => {
    if (typeof window === 'undefined') return;

    if (walletData) {
      sessionStorage.setItem(SESSION_WALLET_KEY, JSON.stringify(walletData));
    } else {
      sessionStorage.removeItem(SESSION_WALLET_KEY);
    }
  };

  // Load wallet from session storage
  const loadWalletFromSession = useCallback((): WalletData | null => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = sessionStorage.getItem(SESSION_WALLET_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load wallet from session:', error);
      return null;
    }
  }, []);

  // Get the authoritative Signer ID
  const getSignerId = (): string | null => {
    return getAuthoritativeSignerId(wallet, currentUser);
  };

  // Check identity consistency whenever wallet or currentUser changes
  useEffect(() => {
    if (wallet && currentUser) {
      const consistencyResult = checkIdentityConsistency(wallet, currentUser);
      setIdentityConsistent(consistencyResult.isConsistent);
      setIdentityIssues(consistencyResult.issues);
      setIdentityErrorMessage(createIdentityErrorMessage(consistencyResult));

      // Log consistency check
      logIdentityConsistency(wallet, currentUser, 'WalletContext');

      // Show warning if inconsistent
      if (!consistencyResult.isConsistent) {
        console.warn('🚨 Identity Consistency Issues Detected:', {
          issues: consistencyResult.issues,
          recommendedAction: consistencyResult.recommendedAction,
          details: consistencyResult.details
        });
      }
    } else {
      setIdentityConsistent(true);
      setIdentityIssues([]);
      setIdentityErrorMessage('');
    }
  }, [wallet, currentUser]);

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
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(!!user);

      // If we have a user but no wallet in state, try to load from session first
      if (user && !wallet) {
        const sessionWallet = loadWalletFromSession();
        if (sessionWallet) {
          setWalletState(sessionWallet);
        } else {
          await loadWalletFromStorage();
        }
      }
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  }, [wallet, loadWalletFromSession, loadWalletFromStorage]);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      try {
        // Migrate from old single wallet storage if needed
        migrateFromSingleWallet();

        // Check if wallet exists in localStorage
        const walletExists = hasStoredWallet();
        setHasWallet(walletExists);

        // Try to load wallet from session storage first
        const sessionWallet = loadWalletFromSession();
        if (sessionWallet) {
          setWalletState(sessionWallet);
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
  }, [refreshAuth, loadWalletFromSession]);

  const setWallet = (newWallet: WalletData | null) => {
    setWalletState(newWallet);

    // Store in session storage for persistence
    storeWalletInSession(newWallet);

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

      // Clear session storage
      storeWalletInSession(null);

      // Update hasWallet state - wallet should still be stored for future logins
      setHasWallet(hasStoredWallet());

      // Clear identity state
      setIdentityConsistent(true);
      setIdentityIssues([]);
      setIdentityErrorMessage('');

      // IMPORTANT: DO NOT remove stored wallet
      // The encrypted wallet stays in localStorage so user can login again
      // with the SAME custom_id and wallet_address
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
        getSignerId,
        identityConsistent,
        identityIssues,
        identityErrorMessage,
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
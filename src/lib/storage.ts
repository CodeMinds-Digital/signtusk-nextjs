import { EncryptedWallet } from './wallet';

const WALLET_STORAGE_KEY = 'encrypted_wallet';
const SESSION_STORAGE_KEY = 'wallet_session';

/**
 * Store encrypted wallet in localStorage
 */
export function storeEncryptedWallet(encryptedWallet: EncryptedWallet): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(encryptedWallet));
  } catch {
    throw new Error('Failed to store wallet data');
  }
}

/**
 * Retrieve encrypted wallet from localStorage
 */
export function getEncryptedWallet(): EncryptedWallet | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to retrieve wallet data:', error);
    return null;
  }
}

/**
 * Check if wallet exists in storage
 */
export function hasStoredWallet(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(WALLET_STORAGE_KEY) !== null;
}

/**
 * Remove wallet from storage
 */
export function removeStoredWallet(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WALLET_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Store session data
 */
export function storeSession(address: string): void {
  if (typeof window === 'undefined') return;
  
  const sessionData = {
    address,
    timestamp: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
}

/**
 * Get session data
 */
export function getSession(): { address: string; timestamp: number; expiresAt: number } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored);
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to retrieve session:', error);
    return null;
  }
}

/**
 * Clear session
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Check if user has active session
 */
export function hasActiveSession(): boolean {
  return getSession() !== null;
}
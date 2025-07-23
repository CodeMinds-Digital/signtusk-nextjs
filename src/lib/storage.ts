import { EncryptedWallet } from './wallet';

const WALLET_STORAGE_KEY = 'encrypted_wallet';

/**
 * Store encrypted wallet in localStorage (for client-side access)
 * The wallet is also stored in Supabase via API calls
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
 * Check if wallet exists in localStorage
 */
export function hasStoredWallet(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(WALLET_STORAGE_KEY) !== null;
}

/**
 * Remove wallet from localStorage
 */
export function removeStoredWallet(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WALLET_STORAGE_KEY);
}

/**
 * API functions for Supabase integration
 */

/**
 * Create wallet in Supabase database
 */
export async function createWalletInDatabase(walletAddress: string, encryptedPrivateKey: string): Promise<void> {
  const response = await fetch('/api/wallet/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
      encrypted_private_key: encryptedPrivateKey
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create wallet');
  }
}

/**
 * Get authentication challenge from server
 */
export async function getAuthChallenge(walletAddress: string): Promise<string> {
  const response = await fetch('/api/auth/challenge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wallet_address: walletAddress
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get challenge');
  }

  const data = await response.json();
  return data.nonce;
}

/**
 * Verify signature and authenticate
 */
export async function verifySignature(walletAddress: string, signature: string): Promise<void> {
  const response = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
      signature
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Authentication failed');
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<{ wallet_address: string; custom_id?: string } | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? { 
      wallet_address: data.wallet_address,
      custom_id: data.custom_id 
    } : null;
  } catch {
    return null;
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

/**
 * Delete wallet from database
 */
export async function deleteWalletFromDatabase(): Promise<void> {
  const response = await fetch('/api/wallet/delete', {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete wallet');
  }
}

/**
 * Get wallet data from database
 */
export async function getWalletFromDatabase(): Promise<{ wallet_address: string; encrypted_private_key: string } | null> {
  try {
    const response = await fetch('/api/wallet/get', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.wallet : null;
  } catch {
    return null;
  }
}

/**
 * Check if user has active session
 */
export async function hasActiveSession(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
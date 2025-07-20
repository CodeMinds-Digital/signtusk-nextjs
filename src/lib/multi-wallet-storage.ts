import { EncryptedWallet } from './wallet';

const WALLETS_STORAGE_KEY = 'encrypted_wallets';
const CURRENT_WALLET_KEY = 'current_wallet_address';

interface StoredWallets {
  [address: string]: EncryptedWallet;
}

/**
 * Store encrypted wallet in localStorage (supports multiple wallets)
 */
export function storeEncryptedWallet(encryptedWallet: EncryptedWallet): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existingWallets = getAllStoredWallets();
    const normalizedAddress = encryptedWallet.address.toLowerCase();
    
    existingWallets[normalizedAddress] = encryptedWallet;
    
    localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(existingWallets));
    localStorage.setItem(CURRENT_WALLET_KEY, normalizedAddress);
  } catch {
    throw new Error('Failed to store wallet data');
  }
}

/**
 * Retrieve encrypted wallet from localStorage by address
 */
export function getEncryptedWallet(address?: string): EncryptedWallet | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const wallets = getAllStoredWallets();
    
    // If no address specified, get the current wallet
    const targetAddress = address?.toLowerCase() || getCurrentWalletAddress();
    
    if (!targetAddress) return null;
    
    return wallets[targetAddress] || null;
  } catch (error) {
    console.error('Failed to retrieve wallet data:', error);
    return null;
  }
}

/**
 * Get all stored wallets
 */
export function getAllStoredWallets(): StoredWallets {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(WALLETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to retrieve wallets:', error);
    return {};
  }
}

/**
 * Get current wallet address
 */
export function getCurrentWalletAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_WALLET_KEY);
}

/**
 * Set current wallet address
 */
export function setCurrentWalletAddress(address: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_WALLET_KEY, address.toLowerCase());
}

/**
 * Check if any wallet exists in localStorage
 */
export function hasStoredWallet(): boolean {
  if (typeof window === 'undefined') return false;
  const wallets = getAllStoredWallets();
  return Object.keys(wallets).length > 0;
}

/**
 * Check if specific wallet exists
 */
export function hasStoredWalletForAddress(address: string): boolean {
  if (typeof window === 'undefined') return false;
  const wallets = getAllStoredWallets();
  return wallets[address.toLowerCase()] !== undefined;
}

/**
 * Remove specific wallet from localStorage
 */
export function removeStoredWallet(address?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const wallets = getAllStoredWallets();
    const targetAddress = address?.toLowerCase() || getCurrentWalletAddress();
    
    if (!targetAddress) return;
    
    delete wallets[targetAddress];
    
    localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(wallets));
    
    // If we removed the current wallet, clear the current wallet reference
    if (getCurrentWalletAddress() === targetAddress) {
      localStorage.removeItem(CURRENT_WALLET_KEY);
    }
  } catch (error) {
    console.error('Failed to remove wallet:', error);
  }
}

/**
 * Remove all wallets from localStorage
 */
export function removeAllStoredWallets(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WALLETS_STORAGE_KEY);
  localStorage.removeItem(CURRENT_WALLET_KEY);
}

/**
 * Get list of stored wallet addresses and their custom IDs
 */
export function getStoredWalletList(): Array<{ address: string; customId: string }> {
  const wallets = getAllStoredWallets();
  return Object.values(wallets).map(wallet => ({
    address: wallet.address,
    customId: wallet.customId
  }));
}

/**
 * Switch to a different stored wallet
 */
export function switchToWallet(address: string): boolean {
  if (!hasStoredWalletForAddress(address)) {
    return false;
  }
  
  setCurrentWalletAddress(address);
  return true;
}

/**
 * Migrate from old single wallet storage to new multi-wallet storage
 */
export function migrateFromSingleWallet(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Check if old storage exists
    const oldWallet = localStorage.getItem('encrypted_wallet');
    if (!oldWallet) return;
    
    // Parse old wallet
    const encryptedWallet: EncryptedWallet = JSON.parse(oldWallet);
    
    // Store in new format
    storeEncryptedWallet(encryptedWallet);
    
    // Remove old storage
    localStorage.removeItem('encrypted_wallet');
    
    console.log('Migrated wallet from single to multi-wallet storage');
  } catch (error) {
    console.error('Failed to migrate wallet storage:', error);
  }
}
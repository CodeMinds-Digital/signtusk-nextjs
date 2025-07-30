/**
 * Storage service for combined security (Maximum v3) implementation
 * Manages client-side storage of steganography data and metadata
 */

import { CombinedSecurityResult } from './combined-security';

const COMBINED_WALLETS_KEY = 'combined_secure_wallets';
const COMBINED_KEYS_KEY = 'combined_secure_keys';
const CURRENT_WALLET_KEY = 'current_wallet_address';
const INDEXEDDB_NAME = 'SignTuskSecureStorage';
const INDEXEDDB_VERSION = 1;
const STEGO_STORE_NAME = 'stegoImages';

interface StoredCombinedWalletInfo {
  address: string;
  customId: string;
  version: string;
  salt: string;
  createdAt: number;
  lastAccessed: number;
}

interface StoredCombinedWallets {
  [address: string]: StoredCombinedWalletInfo;
}

interface StoredCombinedKeys {
  [address: string]: string; // stegoKey
}

/**
 * Store wallet with combined security
 */
export async function storeCombinedSecureWallet(
  securityResult: CombinedSecurityResult
): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const normalizedAddress = securityResult.address.toLowerCase();
    
    // Store stego image in IndexedDB
    await storeImageInIndexedDB(normalizedAddress, securityResult.stegoImage);
    
    // Store stego key in localStorage (separate from wallet info for security)
    const stegoKeys = getCombinedKeys();
    stegoKeys[normalizedAddress] = securityResult.stegoKey;
    localStorage.setItem(COMBINED_KEYS_KEY, JSON.stringify(stegoKeys));
    
    // Store wallet reference info (without sensitive data) in localStorage
    const existingWallets = getCombinedWallets();
    existingWallets[normalizedAddress] = {
      address: securityResult.address,
      customId: securityResult.customId,
      version: securityResult.version,
      salt: securityResult.salt,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };
    
    localStorage.setItem(COMBINED_WALLETS_KEY, JSON.stringify(existingWallets));
    localStorage.setItem(CURRENT_WALLET_KEY, normalizedAddress);
    
    console.log('Combined secure wallet stored successfully');
  } catch (error) {
    console.error('Failed to store wallet with combined security:', error);
    throw new Error('Failed to store wallet data securely');
  }
}

/**
 * Retrieve wallet with combined security
 */
export async function getCombinedSecureWallet(
  address?: string
): Promise<CombinedSecurityResult | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    // Get target address
    const targetAddress = address?.toLowerCase() || getCurrentWalletAddress();
    if (!targetAddress) return null;
    
    // Get wallet info
    const wallets = getCombinedWallets();
    const walletInfo = wallets[targetAddress];
    if (!walletInfo) return null;
    
    // Get stego key
    const stegoKeys = getCombinedKeys();
    const stegoKey = stegoKeys[targetAddress];
    if (!stegoKey) return null;
    
    // Get stego image from IndexedDB
    const stegoImage = await getImageFromIndexedDB(targetAddress);
    if (!stegoImage) return null;
    
    // Update last accessed time
    walletInfo.lastAccessed = Date.now();
    wallets[targetAddress] = walletInfo;
    localStorage.setItem(COMBINED_WALLETS_KEY, JSON.stringify(wallets));
    
    // Return combined security result
    return {
      stegoImage,
      stegoKey,
      address: walletInfo.address,
      customId: walletInfo.customId,
      version: walletInfo.version,
      salt: walletInfo.salt
    };
  } catch (error) {
    console.error('Failed to retrieve wallet with combined security:', error);
    return null;
  }
}

/**
 * Check if combined secure wallet exists
 */
export function hasCombinedSecureWallet(address?: string): boolean {
  const targetAddress = address?.toLowerCase() || getCurrentWalletAddress();
  if (!targetAddress) return false;
  
  const wallets = getCombinedWallets();
  const stegoKeys = getCombinedKeys();
  
  return !!(wallets[targetAddress] && stegoKeys[targetAddress]);
}

/**
 * List all combined secure wallets
 */
export function listCombinedSecureWallets(): StoredCombinedWalletInfo[] {
  const wallets = getCombinedWallets();
  return Object.values(wallets).sort((a, b) => b.lastAccessed - a.lastAccessed);
}

/**
 * Remove combined secure wallet
 */
export async function removeCombinedSecureWallet(address: string): Promise<void> {
  const normalizedAddress = address.toLowerCase();
  
  try {
    // Remove from IndexedDB
    await removeImageFromIndexedDB(normalizedAddress);
    
    // Remove from localStorage
    const wallets = getCombinedWallets();
    delete wallets[normalizedAddress];
    localStorage.setItem(COMBINED_WALLETS_KEY, JSON.stringify(wallets));
    
    const stegoKeys = getCombinedKeys();
    delete stegoKeys[normalizedAddress];
    localStorage.setItem(COMBINED_KEYS_KEY, JSON.stringify(stegoKeys));
    
    // Update current wallet if it was the removed one
    if (getCurrentWalletAddress() === normalizedAddress) {
      const remainingWallets = Object.keys(wallets);
      if (remainingWallets.length > 0) {
        localStorage.setItem(CURRENT_WALLET_KEY, remainingWallets[0]);
      } else {
        localStorage.removeItem(CURRENT_WALLET_KEY);
      }
    }
    
    console.log('Combined secure wallet removed successfully');
  } catch (error) {
    console.error('Failed to remove combined secure wallet:', error);
    throw new Error('Failed to remove wallet data');
  }
}

/**
 * Get combined wallet info from localStorage
 */
function getCombinedWallets(): StoredCombinedWallets {
  try {
    const stored = localStorage.getItem(COMBINED_WALLETS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to retrieve combined wallets:', error);
    return {};
  }
}

/**
 * Get combined keys from localStorage
 */
function getCombinedKeys(): StoredCombinedKeys {
  try {
    const stored = localStorage.getItem(COMBINED_KEYS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to retrieve combined keys:', error);
    return {};
  }
}

/**
 * Get current wallet address
 */
function getCurrentWalletAddress(): string | null {
  try {
    return localStorage.getItem(CURRENT_WALLET_KEY);
  } catch (error) {
    console.error('Failed to get current wallet address:', error);
    return null;
  }
}

/**
 * Store image in IndexedDB
 */
async function storeImageInIndexedDB(address: string, image: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);
    
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STEGO_STORE_NAME)) {
        db.createObjectStore(STEGO_STORE_NAME);
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([STEGO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STEGO_STORE_NAME);
      
      const putRequest = store.put(image, address);
      
      putRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      putRequest.onerror = () => {
        db.close();
        reject(new Error('Failed to store image in IndexedDB'));
      };
    };
  });
}

/**
 * Get image from IndexedDB
 */
async function getImageFromIndexedDB(address: string): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);
    
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STEGO_STORE_NAME)) {
        db.close();
        resolve(null);
        return;
      }
      
      const transaction = db.transaction([STEGO_STORE_NAME], 'readonly');
      const store = transaction.objectStore(STEGO_STORE_NAME);
      
      const getRequest = store.get(address);
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result || null);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(new Error('Failed to retrieve image from IndexedDB'));
      };
    };
  });
}

/**
 * Remove image from IndexedDB
 */
async function removeImageFromIndexedDB(address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);
    
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STEGO_STORE_NAME)) {
        db.close();
        resolve();
        return;
      }
      
      const transaction = db.transaction([STEGO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STEGO_STORE_NAME);
      
      const deleteRequest = store.delete(address);
      
      deleteRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      deleteRequest.onerror = () => {
        db.close();
        reject(new Error('Failed to remove image from IndexedDB'));
      };
    };
  });
}

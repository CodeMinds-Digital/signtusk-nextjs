import * as bip39 from 'bip39';
import { Wallet, getAddress } from 'ethers';
import CryptoJS from 'crypto-js';

export interface WalletData {
  address: string;
  privateKey: string;
  mnemonic: string;
  customId: string;
}

export interface EncryptedWallet {
  encryptedMnemonic: string;
  encryptedPrivateKey: string;
  address: string;
  customId: string;
  salt: string;
}

/**
 * Generate a custom ID for the wallet (18 characters, alphanumeric)
 * Format: Random mix of uppercase letters and numbers
 * Example: XZ9A93BF12DE3QWART
 */
export function generateCustomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  let customId = '';

  // Generate 18 random alphanumeric characters
  for (let i = 0; i < 18; i++) {
    customId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return customId;
}

/**
 * Generate a unique custom ID by checking against existing wallets
 */
export async function generateUniqueCustomId(): Promise<string> {
  let customId = generateCustomId();
  let attempts = 0;
  const maxAttempts = 10;

  // Check uniqueness against database
  while (attempts < maxAttempts) {
    try {
      // Check if custom ID already exists in database
      const response = await fetch('/api/wallet/check-custom-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ custom_id: customId })
      });

      if (response.ok) {
        const result = await response.json();
        if (!result.exists) {
          return customId; // Unique ID found
        }
      }

      // Generate new ID if current one exists
      customId = generateCustomId();
      attempts++;
    } catch (error) {
      console.error('Error checking custom ID uniqueness:', error);
      // If API fails, return the generated ID (fallback)
      return customId;
    }
  }

  // If we can't find a unique ID after max attempts, add timestamp
  return customId + Date.now().toString().slice(-3);
}

/**
 * Generate a new wallet with mnemonic phrase
 */
export function generateWallet(wordCount: 12 | 24 = 12): WalletData {
  // Generate entropy based on word count
  const entropy = wordCount === 12 ? 128 : 256;

  // Generate mnemonic
  const mnemonic = bip39.generateMnemonic(entropy);

  // Create wallet from mnemonic
  const wallet = Wallet.fromPhrase(mnemonic);

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: mnemonic,
    customId: generateCustomId() // Will be replaced with unique ID during signup
  };
}

/**
 * Generate a new wallet with unique custom ID (async version)
 */
export async function generateWalletWithUniqueId(wordCount: 12 | 24 = 12): Promise<WalletData> {
  // Generate entropy based on word count
  const entropy = wordCount === 12 ? 128 : 256;

  // Generate mnemonic
  const mnemonic = bip39.generateMnemonic(entropy);

  // Create wallet from mnemonic
  const wallet = Wallet.fromPhrase(mnemonic);

  // Generate unique custom ID
  const customId = await generateUniqueCustomId();

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: mnemonic,
    customId: customId
  };
}

/**
 * Restore wallet from mnemonic
 */
export function restoreWalletFromMnemonic(mnemonic: string): WalletData {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  const wallet = Wallet.fromPhrase(mnemonic);

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: mnemonic,
    customId: generateCustomId()
  };
}

/**
 * Encrypt wallet data with password
 */
export function encryptWallet(walletData: WalletData, password: string): EncryptedWallet {
  // Generate a random salt
  const salt = CryptoJS.lib.WordArray.random(256 / 8).toString();

  // Derive key from password and salt
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000
  });

  // Encrypt mnemonic and private key
  const encryptedMnemonic = CryptoJS.AES.encrypt(walletData.mnemonic, key.toString()).toString();
  const encryptedPrivateKey = CryptoJS.AES.encrypt(walletData.privateKey, key.toString()).toString();

  return {
    encryptedMnemonic,
    encryptedPrivateKey,
    address: walletData.address,
    customId: walletData.customId,
    salt
  };
}

/**
 * Decrypt wallet data with password
 */
export function decryptWallet(encryptedWallet: EncryptedWallet, password: string): WalletData {
  try {
    // Derive key from password and salt
    const key = CryptoJS.PBKDF2(password, encryptedWallet.salt, {
      keySize: 256 / 32,
      iterations: 10000
    });

    // Decrypt mnemonic and private key
    const decryptedMnemonic = CryptoJS.AES.decrypt(encryptedWallet.encryptedMnemonic, key.toString()).toString(CryptoJS.enc.Utf8);
    const decryptedPrivateKey = CryptoJS.AES.decrypt(encryptedWallet.encryptedPrivateKey, key.toString()).toString(CryptoJS.enc.Utf8);

    if (!decryptedMnemonic || !decryptedPrivateKey) {
      throw new Error('Invalid password');
    }

    return {
      address: encryptedWallet.address,
      privateKey: decryptedPrivateKey,
      mnemonic: decryptedMnemonic,
      customId: encryptedWallet.customId
    };
  } catch {
    throw new Error('Invalid password or corrupted wallet data');
  }
}

/**
 * Validate mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

/**
 * Get random words from mnemonic for verification
 * Automatically determines count based on mnemonic length:
 * - 12 words: ask for 4 random words
 * - 24 words: ask for 6 random words
 */
export function getRandomWordsForVerification(mnemonic: string, count?: number): Array<{ index: number, word: string }> {
  const words = mnemonic.split(' ');

  // Determine verification count based on mnemonic length if not specified
  let verificationCount = count;
  if (!verificationCount) {
    if (words.length === 12) {
      verificationCount = 4; // Ask for 4 out of 12 words
    } else if (words.length === 24) {
      verificationCount = 6; // Ask for 6 out of 24 words
    } else {
      verificationCount = Math.min(3, words.length); // Fallback for other lengths
    }
  }

  const indices = new Set<number>();

  // Generate unique random indices
  while (indices.size < verificationCount) {
    indices.add(Math.floor(Math.random() * words.length));
  }

  return Array.from(indices)
    .sort((a, b) => a - b) // Sort indices for better UX
    .map(index => ({
      index: index + 1, // 1-based indexing for user display
      word: words[index]
    }));
}

/**
 * Verify selected words match the mnemonic
 */
export function verifyMnemonicWords(
  mnemonic: string,
  selectedWords: Array<{ index: number, word: string }>
): boolean {
  const words = mnemonic.split(' ');

  return selectedWords.every(({ index, word }) => {
    return words[index - 1] === word; // Convert back to 0-based indexing
  });
}

/**
 * Normalize address to lowercase for storage and comparison
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Get checksummed address for display
 */
export function getChecksumAddress(address: string): string {
  try {
    return getAddress(address).toLowerCase();
  } catch {
    return address.toLowerCase(); // Return original in lowercase if invalid
  }
}

/**
 * Compare two addresses (case-insensitive)
 */
export function addressesEqual(address1: string, address2: string): boolean {
  return normalizeAddress(address1) === normalizeAddress(address2);
}
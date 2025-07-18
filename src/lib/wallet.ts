import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { Wallet } from 'ethers';
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
 * Generate a custom ID for the wallet (15 characters, uppercase only)
 * Format: 3 letters + 4 numbers + 4 letters + 4 numbers
 */
export function generateCustomId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let customId = '';
  
  // First 3 letters
  for (let i = 0; i < 3; i++) {
    customId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 4 numbers
  for (let i = 0; i < 4; i++) {
    customId += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  // 4 letters
  for (let i = 0; i < 4; i++) {
    customId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 4 numbers
  for (let i = 0; i < 4; i++) {
    customId += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return customId;
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
    customId: generateCustomId()
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
  const salt = CryptoJS.lib.WordArray.random(256/8).toString();
  
  // Derive key from password and salt
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
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
      keySize: 256/32,
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
  } catch (error) {
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
 */
export function getRandomWordsForVerification(mnemonic: string, count: number = 3): Array<{index: number, word: string}> {
  const words = mnemonic.split(' ');
  const indices = new Set<number>();
  
  // Generate unique random indices
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * words.length));
  }
  
  return Array.from(indices).map(index => ({
    index: index + 1, // 1-based indexing for user display
    word: words[index]
  }));
}

/**
 * Verify selected words match the mnemonic
 */
export function verifyMnemonicWords(
  mnemonic: string, 
  selectedWords: Array<{index: number, word: string}>
): boolean {
  const words = mnemonic.split(' ');
  
  return selectedWords.every(({ index, word }) => {
    return words[index - 1] === word; // Convert back to 0-based indexing
  });
}
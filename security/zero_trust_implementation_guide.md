# Zero Trust Implementation Guide for Developers

This technical guide provides detailed implementation instructions for developers integrating the Zero Trust security measures into the SignTusk application. It focuses on the code-level details of implementing enhanced encryption, steganography, and the combined approach.

## Table of Contents

1. [Library Dependencies](#library-dependencies)
2. [Enhanced Encryption Implementation](#enhanced-encryption-implementation)
3. [Steganography Implementation](#steganography-implementation)
4. [Combined Security Implementation](#combined-security-implementation)
5. [Integration with Authentication Flow](#integration-with-authentication-flow)
6. [API Endpoint Updates](#api-endpoint-updates)
7. [Migration Strategy](#migration-strategy)
8. [Testing and Validation](#testing-and-validation)

## Library Dependencies

Add the following dependencies to your project:

```bash
npm install steg-js @peculiar/webcrypto
```

For TypeScript type definitions:

```bash
npm install --save-dev @types/steg-js
```

## Enhanced Encryption Implementation

### 1. Create Enhanced Encryption Service

Create a new file `src/lib/enhanced-encryption.ts`:

```typescript
/**
 * Enhanced encryption service using Web Crypto API
 */

// Key derivation parameters
const PBKDF2_ITERATIONS = 310000;
const KEY_LENGTH = 256; // bits
const SALT_LENGTH = 32; // bytes

// Encryption parameters
const IV_LENGTH = 12; // bytes (for GCM mode)
const AUTH_TAG_LENGTH = 16; // bytes
const ALGORITHM = 'AES-GCM'; // Using GCM mode for authenticated encryption

export interface EncryptionResult {
  ciphertext: string;  // Base64-encoded encrypted data
  iv: string;          // Base64-encoded initialization vector
  salt: string;        // Base64-encoded salt
  authTag: string;     // Base64-encoded authentication tag
}

/**
 * Derive a cryptographic key from a password and salt
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Convert password to key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive key using PBKDF2
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // Extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with a password
 */
export async function encryptData(data: string, password: string): Promise<EncryptionResult> {
  try {
    // Generate random salt and IV
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Derive key from password and salt
    const key = await deriveKey(password, salt);
    
    // Encode data to encrypt
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Encrypt data
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv
      },
      key,
      dataBuffer
    );
    
    // Split the result into ciphertext and auth tag
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ciphertextLength = encryptedArray.length - AUTH_TAG_LENGTH;
    const ciphertext = encryptedArray.slice(0, ciphertextLength);
    const authTag = encryptedArray.slice(ciphertextLength);
    
    // Convert binary data to Base64 strings
    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
      authTag: arrayBufferToBase64(authTag)
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data with a password
 */
export async function decryptData(
  encryptedData: EncryptionResult,
  password: string
): Promise<string> {
  try {
    // Convert Base64 strings back to binary data
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = base64ToArrayBuffer(encryptedData.iv);
    const salt = base64ToArrayBuffer(encryptedData.salt);
    const authTag = base64ToArrayBuffer(encryptedData.authTag);
    
    // Derive key from password and salt
    const key = await deriveKey(password, new Uint8Array(salt));
    
    // Combine ciphertext and auth tag
    const encryptedBuffer = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    encryptedBuffer.set(new Uint8Array(ciphertext), 0);
    encryptedBuffer.set(new Uint8Array(authTag), ciphertext.byteLength);
    
    // Decrypt data
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: new Uint8Array(iv)
      },
      key,
      encryptedBuffer
    );
    
    // Decode decrypted data
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data: Invalid password or corrupted data');
  }
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if Web Crypto API is available
 */
export function isWebCryptoAvailable(): boolean {
  return window.crypto && !!window.crypto.subtle;
}

/**
 * Polyfill for environments without Web Crypto API
 */
export function setupCryptoPolyfill(): void {
  if (typeof window !== 'undefined' && !isWebCryptoAvailable()) {
    // Import polyfill
    const { Crypto } = require('@peculiar/webcrypto');
    
    // Apply polyfill
    if (!window.crypto) {
      (window as any).crypto = new Crypto();
    } else if (!window.crypto.subtle) {
      window.crypto.subtle = new Crypto().subtle;
    }
    
    console.warn('Using Web Crypto API polyfill');
  }
}
```

### 2. Create Enhanced Wallet Encryption

Create a new file `src/lib/enhanced-wallet.ts`:

```typescript
import { WalletData, EncryptedWallet } from './wallet';
import { encryptData, decryptData, EncryptionResult } from './enhanced-encryption';

/**
 * Enhanced encrypted wallet format with stronger encryption
 */
export interface EnhancedEncryptedWallet {
  mnemonicEncryption: EncryptionResult;
  privateKeyEncryption: EncryptionResult;
  address: string;
  customId: string;
  version: string; // For versioning and backward compatibility
}

/**
 * Encrypt wallet with enhanced security
 */
export async function encryptWalletEnhanced(
  walletData: WalletData,
  password: string
): Promise<EnhancedEncryptedWallet> {
  // Encrypt mnemonic
  const mnemonicEncryption = await encryptData(walletData.mnemonic, password);
  
  // Encrypt private key
  const privateKeyEncryption = await encryptData(walletData.privateKey, password);
  
  return {
    mnemonicEncryption,
    privateKeyEncryption,
    address: walletData.address,
    customId: walletData.customId,
    version: 'v2' // Version identifier for this encryption format
  };
}

/**
 * Decrypt wallet with enhanced security
 */
export async function decryptWalletEnhanced(
  encryptedWallet: EnhancedEncryptedWallet,
  password: string
): Promise<WalletData> {
  try {
    // Decrypt mnemonic
    const mnemonic = await decryptData(encryptedWallet.mnemonicEncryption, password);
    
    // Decrypt private key
    const privateKey = await decryptData(encryptedWallet.privateKeyEncryption, password);
    
    return {
      address: encryptedWallet.address,
      privateKey,
      mnemonic,
      customId: encryptedWallet.customId
    };
  } catch (error) {
    throw new Error('Failed to decrypt wallet: Invalid password or corrupted data');
  }
}

/**
 * Convert legacy encrypted wallet to enhanced format
 */
export async function upgradeLegacyWallet(
  legacyWallet: EncryptedWallet,
  password: string
): Promise<EnhancedEncryptedWallet> {
  try {
    // First decrypt using the legacy method
    const decryptedWallet = decryptWallet(legacyWallet, password);
    
    // Then re-encrypt using the enhanced method
    return await encryptWalletEnhanced(decryptedWallet, password);
  } catch (error) {
    throw new Error('Failed to upgrade wallet: Invalid password or corrupted data');
  }
}

/**
 * Check if a wallet is in the enhanced format
 */
export function isEnhancedWallet(wallet: any): wallet is EnhancedEncryptedWallet {
  return wallet && 
         wallet.version === 'v2' && 
         wallet.mnemonicEncryption && 
         wallet.privateKeyEncryption;
}

// Import the legacy decryption function for backward compatibility
import { decryptWallet } from './wallet';
```

## Steganography Implementation

### 1. Create Steganography Service

Create a new file `src/lib/steganography.ts`:

```typescript
import { encode, decode } from 'steg-js';

/**
 * Interface for steganography options
 */
interface StegoOptions {
  quality?: number;       // JPEG quality (0-100)
  randomSeed?: string;    // Seed for randomization
  algorithm?: 'lsb' | 'dct'; // Algorithm to use (LSB or DCT)
  coverage?: number;      // Percentage of image to use (0-100)
}

/**
 * Default carrier image to use when none is provided
 * This would be a generic, innocent-looking image bundled with the application
 */
const DEFAULT_CARRIER_IMAGE = '/assets/default-carrier.png';

/**
 * Hide data within an image
 */
export async function hideDataInImage(
  data: string, 
  carrierImageFile?: File,
  options: StegoOptions = {}
): Promise<{ stegoImage: Blob; stegoKey: string }> {
  try {
    // Use provided image or fetch default carrier
    const imageUrl = carrierImageFile 
      ? URL.createObjectURL(carrierImageFile)
      : DEFAULT_CARRIER_IMAGE;
    
    // Load the carrier image
    const image = await loadImage(imageUrl);
    
    // Generate a random stegoKey if not using a seed
    const stegoKey = options.randomSeed || generateRandomSeed(32);
    
    // Add random padding to prevent statistical analysis
    const paddedData = addRandomPadding(data, stegoKey);
    
    // Hide data in image using steg-js
    const stegoImageData = encode(paddedData, image, {
      quality: options.quality || 90,
      seed: stegoKey,
      algorithm: options.algorithm || 'lsb',
      coverage: options.coverage || 75
    });
    
    // Convert to Blob for storage or transmission
    const stegoImage = dataURLToBlob(stegoImageData);
    
    // Clean up if we created an object URL
    if (carrierImageFile) {
      URL.revokeObjectURL(imageUrl);
    }
    
    return { stegoImage, stegoKey };
  } catch (error) {
    console.error('Steganography encoding error:', error);
    throw new Error('Failed to hide data in image');
  }
}

/**
 * Extract data from a stego image
 */
export async function extractDataFromImage(
  stegoImage: Blob | File,
  stegoKey: string
): Promise<string> {
  try {
    // Convert Blob/File to data URL
    const imageUrl = URL.createObjectURL(stegoImage);
    
    // Load the stego image
    const image = await loadImage(imageUrl);
    
    // Extract hidden data using steg-js
    const extractedData = decode(image, { seed: stegoKey });
    
    // Remove padding
    const data = removeRandomPadding(extractedData, stegoKey);
    
    // Clean up
    URL.revokeObjectURL(imageUrl);
    
    return data;
  } catch (error) {
    console.error('Steganography decoding error:', error);
    throw new Error('Failed to extract data from image');
  }
}

/**
 * Helper function to load an image from URL
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Generate a random seed for steganography
 */
function generateRandomSeed(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  
  // Use crypto API for better randomness if available
  if (window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += characters.charAt(values[i] % charactersLength);
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
  }
  
  return result;
}

/**
 * Add random padding to data to prevent statistical analysis
 */
function addRandomPadding(data: string, seed: string): string {
  // Use the seed to generate deterministic padding
  const paddingLength = hashCode(seed) % 1000 + 500; // 500-1500 bytes of padding
  const padding = generatePaddingData(paddingLength, seed);
  
  // Format: [padding length as 6 digits][data][padding]
  return `${paddingLength.toString().padStart(6, '0')}${data}${padding}`;
}

/**
 * Remove random padding from extracted data
 */
function removeRandomPadding(paddedData: string, seed: string): string {
  // Extract padding length from first 6 characters
  const paddingLength = parseInt(paddedData.substring(0, 6), 10);
  
  // Extract the actual data (everything between the length prefix and the padding)
  const data = paddedData.substring(6, paddedData.length - paddingLength);
  
  return data;
}

/**
 * Generate deterministic padding data based on seed
 */
function generatePaddingData(length: number, seed: string): string {
  let result = '';
  const seedHash = hashCode(seed);
  
  for (let i = 0; i < length; i++) {
    // Use a simple PRNG based on the seed
    const charCode = ((seedHash * (i + 1)) % 94) + 33; // Printable ASCII
    result += String.fromCharCode(charCode);
  }
  
  return result;
}

/**
 * Simple hash function for seeds
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Convert data URL to Blob
 */
function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}
```

## Combined Security Implementation

### 1. Create Combined Security Service

Create a new file `src/lib/combined-security.ts`:

```typescript
import { WalletData } from './wallet';
import { encryptData, decryptData } from './enhanced-encryption';
import { hideDataInImage, extractDataFromImage } from './steganography';

/**
 * Combined security result containing both encryption and steganography
 */
export interface CombinedSecurityResult {
  stegoImage: Blob;
  stegoKey: string;
  address: string;
  customId: string;
  version: string;
  salt: string; // Additional salt for key derivation
}

/**
 * Encrypt and hide wallet data using combined approach
 */
export async function secureWalletData(
  walletData: WalletData,
  password: string,
  carrierImageFile?: File
): Promise<CombinedSecurityResult> {
  try {
    // Step 1: Generate a secure random encryption key derived from password
    const salt = generateRandomSalt();
    const encryptionKey = await deriveEncryptionKey(password, salt);
    
    // Step 2: Encrypt the wallet data
    const encryptedMnemonic = await encryptData(walletData.mnemonic, encryptionKey);
    const encryptedPrivateKey = await encryptData(walletData.privateKey, encryptionKey);
    
    // Step 3: Combine encrypted data into a single object
    const encryptedWalletData = {
      encryptedMnemonic,
      encryptedPrivateKey,
      address: walletData.address,
      customId: walletData.customId,
      version: 'v3-combined' // Version for combined security
    };
    
    // Step 4: Convert to JSON string
    const encryptedDataString = JSON.stringify(encryptedWalletData);
    
    // Step 5: Hide encrypted data in image using steganography
    const { stegoImage, stegoKey } = await hideDataInImage(
      encryptedDataString,
      carrierImageFile
    );
    
    // Step 6: Return combined result
    return {
      stegoImage,
      stegoKey,
      address: walletData.address,
      customId: walletData.customId,
      version: 'v3-combined',
      salt
    };
  } catch (error) {
    console.error('Combined security error:', error);
    throw new Error('Failed to secure wallet data');
  }
}

/**
 * Retrieve and decrypt wallet data from combined security
 */
export async function retrieveWalletData(
  securityResult: CombinedSecurityResult,
  password: string
): Promise<WalletData> {
  try {
    // Step 1: Extract encrypted data from stego image
    const encryptedDataString = await extractDataFromImage(
      securityResult.stegoImage,
      securityResult.stegoKey
    );
    
    // Step 2: Parse the JSON string
    const encryptedWalletData = JSON.parse(encryptedDataString);
    
    // Step 3: Derive the encryption key from password and salt
    const encryptionKey = await deriveEncryptionKey(password, securityResult.salt);
    
    // Step 4: Decrypt the wallet data
    const mnemonic = await decryptData(encryptedWalletData.encryptedMnemonic, encryptionKey);
    const privateKey = await decryptData(encryptedWalletData.encryptedPrivateKey, encryptionKey);
    
    // Step 5: Return the decrypted wallet data
    return {
      address: securityResult.address,
      privateKey,
      mnemonic,
      customId: securityResult.customId
    };
  } catch (error) {
    console.error('Wallet retrieval error:', error);
    throw new Error('Failed to retrieve wallet data: Invalid password or corrupted data');
  }
}

/**
 * Generate a random salt for key derivation
 */
function generateRandomSalt(): string {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive an encryption key from password and salt
 */
async function deriveEncryptionKey(password: string, salt: string): Promise<string> {
  // Convert salt from hex string to Uint8Array
  const saltArray = new Uint8Array(salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  // Convert password to key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const keyBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltArray,
      iterations: 310000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 256 bits
  );
  
  // Convert to hex string
  return Array.from(new Uint8Array(keyBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### 2. Create Storage Services for Each Security Level

Create a new file `src/lib/enhanced-storage.ts` for enhanced encryption storage:

```typescript
import { EnhancedEncryptedWallet, isEnhancedWallet, upgradeLegacyWallet } from './enhanced-wallet';
import { WalletData } from './wallet';

const ENHANCED_WALLETS_KEY = 'enhanced_encrypted_wallets';
const WALLET_VERSION_KEY = 'wallet_encryption_version';

interface StoredEnhancedWallets {
  [address: string]: EnhancedEncryptedWallet;
}

/**
 * Store enhanced encrypted wallet in localStorage
 */
export function storeEnhancedWallet(wallet: EnhancedEncryptedWallet): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existingWallets = getEnhancedWallets();
    const normalizedAddress = wallet.address.toLowerCase();
    
    existingWallets[normalizedAddress] = wallet;
    
    localStorage.setItem(ENHANCED_WALLETS_KEY, JSON.stringify(existingWallets));
    localStorage.setItem(WALLET_VERSION_KEY, 'v2');
  } catch (error) {
    console.error('Failed to store enhanced wallet:', error);
    throw new Error('Failed to store wallet data securely');
  }
}

/**
 * Get all enhanced wallets
 */
export function getEnhancedWallets(): StoredEnhancedWallets {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(ENHANCED_WALLETS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to retrieve enhanced wallets:', error);
    return {};
  }
}

/**
 * Get enhanced wallet by address
 */
export function getEnhancedWallet(address: string): EnhancedEncryptedWallet | null {
  const wallets = getEnhancedWallets();
  const normalizedAddress = address.toLowerCase();
  
  return wallets[normalizedAddress] || null;
}

/**
 * Check if enhanced wallet exists for address
 */
export function hasEnhancedWallet(address: string): boolean {
  return !!getEnhancedWallet(address);
}

/**
 * Create wallet in database with enhanced encryption
 */
export async function createWalletInDatabaseEnhanced(
  walletData: WalletData,
  password: string
): Promise<void> {
  try {
    // Encrypt wallet with enhanced security
    const { encryptWalletEnhanced } = await import('./enhanced-wallet');
    const enhancedWallet = await encryptWalletEnhanced(walletData, password);
    
    // Store locally
    storeEnhancedWallet(enhancedWallet);
    
    // Prepare data for server storage
    // We only send the private key encryption, not the mnemonic
    const serverData = {
      wallet_address: walletData.address.toLowerCase(),
      encrypted_private_key: JSON.stringify(enhancedWallet.privateKeyEncryption),
      encryption_version: 'v2',
      custom_id: walletData.customId
    };
    
    // Send to server
    const response = await fetch('/api/wallet/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serverData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create wallet on server');
    }
  } catch (error) {
    console.error('Enhanced wallet creation error:', error);
    throw error;
  }
}
```

Create a new file `src/lib/combined-storage.ts` for combined security storage:

```typescript
import { CombinedSecurityResult } from './combined-security';
import { WalletData } from './wallet';

const COMBINED_WALLETS_KEY = 'combined_secure_wallets';
const COMBINED_KEYS_KEY = 'combined_secure_keys';
const CURRENT_WALLET_KEY = 'current_wallet_address';

interface StoredCombinedWalletInfo {
  address: string;
  customId: string;
  version: string;
  salt: string;
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
      salt: securityResult.salt
    };
    
    localStorage.setItem(COMBINED_WALLETS_KEY, JSON.stringify(existingWallets));
    localStorage.setItem(CURRENT_WALLET_KEY, normalizedAddress);
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
function getCombinedKeys(): StoredCombinedKeys
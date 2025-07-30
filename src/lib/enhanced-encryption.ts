/**
 * Enhanced encryption service using Web Crypto API for Zero Trust implementation
 * Provides AES-GCM authenticated encryption with strong key derivation
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
 * Get crypto.subtle with proper initialization
 */
async function getCryptoSubtle(): Promise<SubtleCrypto> {
  // Check if Web Crypto API is available
  if (!isWebCryptoAvailable()) {
    console.log('Web Crypto API not available, setting up polyfill...');
    await setupCryptoPolyfill();
  }

  // Double-check after polyfill
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available and polyfill failed');
  }

  return window.crypto.subtle;
}

/**
 * Derive a cryptographic key from a password and salt
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = await getCryptoSubtle();

  // Convert password to key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive key using PBKDF2
  return subtle.deriveKey(
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
    const subtle = await getCryptoSubtle();

    // Generate random salt and IV
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key from password and salt
    const key = await deriveKey(password, salt);

    // Encode data to encrypt
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Encrypt data
    const encryptedBuffer = await subtle.encrypt(
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
    const subtle = await getCryptoSubtle();
    const decryptedBuffer = await subtle.decrypt(
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
  return typeof window !== 'undefined' && window.crypto && !!window.crypto.subtle;
}

/**
 * Polyfill for environments without Web Crypto API
 */
export async function setupCryptoPolyfill(): Promise<void> {
  if (typeof window !== 'undefined' && !isWebCryptoAvailable()) {
    try {
      console.log('Setting up Web Crypto API polyfill...');

      // Dynamic import to avoid issues with SSR
      const { Crypto } = await import('@peculiar/webcrypto');

      // Apply polyfill
      if (!window.crypto) {
        (window as any).crypto = new Crypto();
        console.log('Applied crypto polyfill');
      } else if (!window.crypto.subtle) {
        window.crypto.subtle = new Crypto().subtle;
        console.log('Applied crypto.subtle polyfill');
      }

      // Verify polyfill worked
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Polyfill failed to provide crypto.subtle');
      }

      console.log('Web Crypto API polyfill setup successfully');
    } catch (error) {
      console.error('Failed to setup Web Crypto API polyfill:', error);
      throw new Error(`Web Crypto API polyfill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

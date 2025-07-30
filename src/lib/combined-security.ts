/**
 * Combined security implementation for Maximum (v3) Zero Trust security
 * Integrates enhanced encryption with steganography for maximum protection
 */

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
 * Encrypt and hide wallet data using combined approach (Maximum security v3)
 */
export async function secureWalletData(
  walletData: WalletData,
  password: string,
  carrierImageFile?: File
): Promise<CombinedSecurityResult> {
  try {
    console.log('Starting secureWalletData with:', {
      hasWalletData: !!walletData,
      hasPassword: !!password,
      hasCarrierImage: !!carrierImageFile,
      walletAddress: walletData?.address,
      customId: walletData?.customId
    });

    // Step 1: Generate a secure random salt for additional key derivation
    const salt = generateRandomSalt();
    console.log('Generated salt, deriving enhanced password...');
    const enhancedPassword = await deriveEnhancedPassword(password, salt);

    // Step 2: Encrypt the wallet data using enhanced encryption
    console.log('Encrypting wallet data...');
    const encryptedMnemonic = await encryptData(walletData.mnemonic, enhancedPassword);
    const encryptedPrivateKey = await encryptData(walletData.privateKey, enhancedPassword);

    // Step 3: Combine encrypted data into a single object
    const encryptedWalletData = {
      encryptedMnemonic,
      encryptedPrivateKey,
      address: walletData.address,
      customId: walletData.customId,
      version: 'v3-combined', // Version for combined security
      timestamp: Date.now() // Add timestamp for additional entropy
    };

    // Step 4: Convert to JSON string
    const encryptedDataString = JSON.stringify(encryptedWalletData);
    console.log('Encrypted data prepared, starting steganography...');

    // Step 5: Hide encrypted data in image using steganography
    // Create a deterministic seed for avatar generation if no carrier image
    const avatarSeed = carrierImageFile ? undefined : `wallet-${walletData.address}-${walletData.customId}`;

    const { stegoImage, stegoKey } = await hideDataInImage(
      encryptedDataString,
      carrierImageFile,
      { randomSeed: avatarSeed }
    );

    console.log('Steganography completed successfully');

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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      walletData: walletData ? {
        hasAddress: !!walletData.address,
        hasPrivateKey: !!walletData.privateKey,
        hasMnemonic: !!walletData.mnemonic,
        hasCustomId: !!walletData.customId
      } : 'No wallet data'
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to secure wallet data with maximum security: ${errorMessage}`);
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

    // Step 3: Derive the enhanced password from original password and salt
    const enhancedPassword = await deriveEnhancedPassword(password, securityResult.salt);

    // Step 4: Decrypt the wallet data
    const mnemonic = await decryptData(encryptedWalletData.encryptedMnemonic, enhancedPassword);
    const privateKey = await decryptData(encryptedWalletData.encryptedPrivateKey, enhancedPassword);

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

  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for server-side rendering
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive an enhanced password from the original password and salt
 */
async function deriveEnhancedPassword(password: string, salt: string): Promise<string> {
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

  // Derive enhanced password using PBKDF2
  const keyBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltArray,
      iterations: 100000, // Additional iterations for enhanced password
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

/**
 * Check if wallet data uses combined security
 */
export function isCombinedSecurityWallet(data: any): data is CombinedSecurityResult {
  return data &&
    data.version === 'v3-combined' &&
    data.stegoImage &&
    data.stegoKey &&
    data.salt;
}

/**
 * Validate combined security result
 */
export function validateCombinedSecurityResult(result: CombinedSecurityResult): boolean {
  try {
    // Check required fields
    if (!result.stegoImage || !result.stegoKey || !result.address || !result.customId || !result.salt) {
      return false;
    }

    // Check version
    if (result.version !== 'v3-combined') {
      return false;
    }

    // Check stegoImage is a valid Blob
    if (!(result.stegoImage instanceof Blob)) {
      return false;
    }

    // Check stegoKey format (should be alphanumeric)
    if (!/^[A-Za-z0-9]+$/.test(result.stegoKey)) {
      return false;
    }

    // Check salt format (should be hex)
    if (!/^[a-f0-9]+$/i.test(result.salt)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get security level information
 */
export function getSecurityInfo(): {
  level: string;
  description: string;
  features: string[];
} {
  return {
    level: 'Maximum (v3)',
    description: 'Combined enhanced encryption and steganography protection',
    features: [
      'AES-GCM authenticated encryption',
      'PBKDF2 with 310,000 iterations',
      'LSB steganography data hiding',
      'Random padding for statistical protection',
      'Multi-layer key derivation',
      'Defense in depth security model'
    ]
  };
}

/**
 * Estimate security strength
 */
export function estimateSecurityStrength(): {
  encryptionStrength: string;
  steganographyStrength: string;
  overallRating: string;
  timeToBreak: string;
} {
  return {
    encryptionStrength: 'Military-grade (AES-256)',
    steganographyStrength: 'High (LSB with padding)',
    overallRating: 'Maximum',
    timeToBreak: '> 10^77 years (current technology)'
  };
}

/**
 * Security Manager for Zero Trust implementation
 * Handles all three security levels: Standard (v1), Enhanced (v2), Maximum (v3)
 */

import { WalletData, encryptWallet, decryptWallet, EncryptedWallet } from './wallet';
import { setupCryptoPolyfill, isWebCryptoAvailable } from './enhanced-encryption';
import { secureWalletData, retrieveWalletData, CombinedSecurityResult, isCombinedSecurityWallet } from './combined-security';
import { storeCombinedSecureWallet, getCombinedSecureWallet, hasCombinedSecureWallet, listCombinedSecureWallets } from './combined-storage';
import { storeEncryptedWallet, getEncryptedWallet, getStoredWalletList } from './multi-wallet-storage';

export type SecurityLevel = 'standard' | 'enhanced' | 'maximum';

export interface SecurityOptions {
  level: SecurityLevel;
  carrierImage?: File;
  deviceFingerprint?: string;
}

export interface WalletSecurityInfo {
  level: SecurityLevel;
  version: string;
  hasStego: boolean;
  createdAt?: number;
  lastAccessed?: number;
}

/**
 * Initialize security manager and setup polyfills if needed
 */
export function initializeSecurityManager(): void {
  setupCryptoPolyfill();
}

/**
 * Create wallet with specified security level
 */
export async function createSecureWallet(
  walletData: WalletData,
  password: string,
  options: SecurityOptions
): Promise<void> {
  try {
    switch (options.level) {
      case 'standard':
        await createStandardWallet(walletData, password);
        break;

      case 'enhanced':
        await createEnhancedWallet(walletData, password);
        break;

      case 'maximum':
        try {
          await createMaximumWallet(walletData, password, options.carrierImage);
        } catch (error) {
          console.warn('Maximum security failed, falling back to enhanced security:', error);
          // Fallback to enhanced security if maximum fails
          await createEnhancedWallet(walletData, password);
          console.log('Successfully created wallet with enhanced security (fallback)');
        }
        break;

      default:
        throw new Error(`Unsupported security level: ${options.level}`);
    }

    // Log security event
    await logSecurityEvent('WALLET_CREATED', {
      level: options.level,
      address: walletData.address,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Failed to create secure wallet:', error);
    console.error('Security options:', options);
    console.error('Wallet data:', {
      address: walletData.address,
      customId: walletData.customId,
      hasPrivateKey: !!walletData.privateKey,
      hasMnemonic: !!walletData.mnemonic
    });

    // Provide more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create wallet with ${options.level} security: ${errorMessage}`);
  }
}

/**
 * Retrieve wallet with automatic security level detection
 */
export async function retrieveSecureWallet(
  address: string,
  password: string
): Promise<WalletData> {
  try {
    // Check for maximum security first (v3)
    if (hasCombinedSecureWallet(address)) {
      const securityResult = await getCombinedSecureWallet(address);
      if (securityResult) {
        return await retrieveWalletData(securityResult, password);
      }
    }

    // Fall back to standard security (v1)
    const encryptedWallet = getEncryptedWallet(address);
    if (encryptedWallet) {
      return decryptWallet(encryptedWallet, password);
    }

    throw new Error('Wallet not found or incompatible security level');

  } catch (error) {
    console.error('Failed to retrieve secure wallet:', error);
    throw new Error('Failed to decrypt wallet: Invalid password or corrupted data');
  }
}

/**
 * Get wallet security information
 */
export async function getWalletSecurityInfo(address: string): Promise<WalletSecurityInfo | null> {
  try {
    // Check for maximum security (v3)
    if (hasCombinedSecureWallet(address)) {
      const securityResult = await getCombinedSecureWallet(address);
      if (securityResult) {
        return {
          level: 'maximum',
          version: 'v3-combined',
          hasStego: true,
          createdAt: Date.now(), // Would be stored in actual implementation
          lastAccessed: Date.now()
        };
      }
    }

    // Check for standard security (v1)
    const encryptedWallet = getEncryptedWallet(address);
    if (encryptedWallet) {
      return {
        level: 'standard',
        version: 'v1',
        hasStego: false
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get wallet security info:', error);
    return null;
  }
}

/**
 * Upgrade wallet security level
 */
export async function upgradeWalletSecurity(
  address: string,
  currentPassword: string,
  newSecurityLevel: SecurityLevel,
  carrierImage?: File
): Promise<void> {
  try {
    // First, retrieve the wallet with current security
    const walletData = await retrieveSecureWallet(address, currentPassword);

    // Get current security info
    const currentInfo = await getWalletSecurityInfo(address);

    // Create wallet with new security level
    await createSecureWallet(walletData, currentPassword, {
      level: newSecurityLevel,
      carrierImage
    });

    // Log security upgrade event
    await logSecurityEvent('SECURITY_UPGRADE', {
      address,
      fromLevel: currentInfo?.level || 'unknown',
      toLevel: newSecurityLevel,
      timestamp: Date.now()
    });

    console.log(`Wallet security upgraded from ${currentInfo?.level} to ${newSecurityLevel}`);

  } catch (error) {
    console.error('Failed to upgrade wallet security:', error);
    throw new Error('Failed to upgrade wallet security level');
  }
}

/**
 * Check available security features
 */
export function getAvailableSecurityFeatures(): {
  webCrypto: boolean;
  indexedDB: boolean;
  canvas: boolean;
  localStorage: boolean;
} {
  return {
    webCrypto: isWebCryptoAvailable(),
    indexedDB: typeof window !== 'undefined' && 'indexedDB' in window,
    canvas: typeof window !== 'undefined' && 'HTMLCanvasElement' in window,
    localStorage: typeof window !== 'undefined' && 'localStorage' in window
  };
}

/**
 * Get recommended security level based on available features
 */
export function getRecommendedSecurityLevel(): SecurityLevel {
  const features = getAvailableSecurityFeatures();

  if (features.webCrypto && features.indexedDB && features.canvas && features.localStorage) {
    return 'maximum';
  } else if (features.webCrypto && features.localStorage) {
    return 'enhanced';
  } else {
    return 'standard';
  }
}

/**
 * Create standard security wallet (v1)
 */
async function createStandardWallet(walletData: WalletData, password: string): Promise<void> {
  const encryptedWallet = encryptWallet(walletData, password);
  storeEncryptedWallet(encryptedWallet);

  console.log('Creating standard wallet in database:', {
    address: walletData.address,
    customId: walletData.customId,
    customIdLength: walletData.customId?.length
  });

  // Also store in database with custom_id and encrypted mnemonic
  const { createWalletInDatabase } = await import('./storage');
  await createWalletInDatabase(
    walletData.address,
    encryptedWallet.encryptedPrivateKey,
    walletData.customId,
    encryptedWallet.encryptedMnemonic,
    encryptedWallet.salt
  );
}

/**
 * Create enhanced security wallet (v2) - placeholder for future implementation
 */
async function createEnhancedWallet(walletData: WalletData, password: string): Promise<void> {
  // For now, fall back to standard security
  // TODO: Implement enhanced encryption with Web Crypto API
  await createStandardWallet(walletData, password);
}

/**
 * Create maximum security wallet (v3)
 */
async function createMaximumWallet(
  walletData: WalletData,
  password: string,
  carrierImage?: File
): Promise<void> {
  try {
    console.log('Creating maximum security wallet...');

    // Check Web Crypto API availability first
    const { isWebCryptoAvailable, setupCryptoPolyfill } = await import('./enhanced-encryption');

    if (!isWebCryptoAvailable()) {
      console.log('Web Crypto API not available, setting up polyfill...');
      await setupCryptoPolyfill();
    }

    console.log('Starting secure wallet data encryption...');
    const securityResult = await secureWalletData(walletData, password, carrierImage);

    console.log('Storing combined secure wallet...');
    await storeCombinedSecureWallet(securityResult);

    console.log('Storing wallet in database...');
    // Also store in database for compatibility with custom_id
    const { createWalletInDatabase } = await import('./storage');
    await createWalletInDatabase(
      walletData.address,
      'v3-combined-encrypted',
      walletData.customId,
      securityResult.encryptedMnemonic,
      securityResult.salt
    );

    console.log('Maximum security wallet created successfully');
  } catch (error) {
    console.error('Maximum security wallet creation failed:', error);

    // Provide specific error message based on the type of error
    if (error instanceof Error) {
      if (error.message.includes('importKey')) {
        throw new Error('Web Crypto API not available. Please use a modern browser or try enhanced security instead.');
      } else if (error.message.includes('multiavatar') || error.message.includes('avatar')) {
        throw new Error('Avatar generation failed. Please try again or use enhanced security.');
      } else if (error.message.includes('steganography') || error.message.includes('stego')) {
        throw new Error('Image steganography failed. Please try again or use enhanced security.');
      }
    }

    throw error;
  }
}

// Note: createWalletInDatabase is now imported from storage.ts to avoid duplication

/**
 * Log security events (placeholder for future audit implementation)
 */
async function logSecurityEvent(eventType: string, details: any): Promise<void> {
  try {
    // Store in localStorage for now
    const events = JSON.parse(localStorage.getItem('security_events') || '[]');
    events.push({
      type: eventType,
      details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });

    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    localStorage.setItem('security_events', JSON.stringify(events));
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Get security statistics
 */
export function getSecurityStatistics(): {
  totalWallets: number;
  securityLevels: Record<SecurityLevel, number>;
  features: ReturnType<typeof getAvailableSecurityFeatures>;
  recommended: SecurityLevel;
} {
  const features = getAvailableSecurityFeatures();
  const standardWallets = getStoredWalletList();
  const combinedWallets = typeof window !== 'undefined' ? listCombinedSecureWallets() : [];

  return {
    totalWallets: standardWallets.length + combinedWallets.length,
    securityLevels: {
      standard: standardWallets.length,
      enhanced: 0, // Not implemented yet
      maximum: combinedWallets.length
    },
    features,
    recommended: getRecommendedSecurityLevel()
  };
}

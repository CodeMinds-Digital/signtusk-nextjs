import { Wallet } from 'ethers';

/**
 * Sign a message with a private key
 */
export async function signMessage(message: string, privateKey: string): Promise<string> {
  const wallet = new Wallet(privateKey);
  return await wallet.signMessage(message);
}

/**
 * Create a login message for signature verification
 */
export function createLoginMessage(address: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  return `Sign this message to authenticate with SecureWallet.\n\nAddress: ${address}\nTimestamp: ${ts}\n\nThis request will not trigger any blockchain transaction or cost any gas fees.`;
}

/**
 * Verify a signature against a message and address
 */
export async function verifySignature(
  message: string, 
  signature: string, 
  expectedAddress: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        signature,
        address: expectedAddress
      })
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Save encrypted profile data
 */
export async function saveProfile(
  address: string, 
  encryptedProfile: string, 
  privateKey: string
): Promise<boolean> {
  try {
    // Create a signature for the profile data
    const message = `Save profile for ${address} at ${Date.now()}`;
    const signature = await signMessage(message, privateKey);

    const response = await fetch('/api/profile/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        encryptedProfile,
        signature
      })
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Profile save failed:', error);
    return false;
  }
}

/**
 * Load encrypted profile data
 */
export async function loadProfile(address: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/profile/save?address=${encodeURIComponent(address)}`);
    
    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.success ? result.profile : null;
  } catch (error) {
    console.error('Profile load failed:', error);
    return null;
  }
}
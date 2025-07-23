import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

/**
 * Sign a document hash using a private key
 * @param documentHash - The hash of the document to sign
 * @param privateKey - The private key to sign with
 * @returns The signature string
 */
export async function signDocument(documentHash: string, privateKey: string): Promise<string> {
  try {
    // Create a wallet instance from the private key
    const wallet = new ethers.Wallet(privateKey);
    
    // Create a message to sign (prefix with standard Ethereum message prefix)
    const message = `SignTusk Document Signature:\nDocument Hash: ${documentHash}\nTimestamp: ${new Date().toISOString()}`;
    
    // Sign the message
    const signature = await wallet.signMessage(message);
    
    return signature;
  } catch (error) {
    console.error('Error signing document:', error);
    throw new Error('Failed to sign document');
  }
}

/**
 * Verify a document signature
 * @param documentHash - The hash of the document
 * @param signature - The signature to verify
 * @param signerAddress - Optional: The expected signer address
 * @returns True if the signature is valid
 */
export async function verifySignature(
  documentHash: string, 
  signature: string, 
  signerAddress?: string
): Promise<boolean> {
  try {
    // Reconstruct the original message that was signed
    const message = `SignTusk Document Signature:\nDocument Hash: ${documentHash}`;
    
    // For verification, we need to extract the timestamp from the signature
    // In a real implementation, you might store the timestamp separately
    // For now, we'll verify against any timestamp pattern
    const messagePattern = new RegExp(`SignTusk Document Signature:\\nDocument Hash: ${documentHash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\nTimestamp: .+`);
    
    try {
      // Try to recover the address from the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      // If a specific signer address is provided, check if it matches
      if (signerAddress) {
        return recoveredAddress.toLowerCase() === signerAddress.toLowerCase();
      }
      
      // If no specific address is provided, just check if we can recover an address
      return ethers.isAddress(recoveredAddress);
    } catch (verifyError) {
      // If the exact message doesn't work, try with different timestamp formats
      // This is a fallback for signatures created at different times
      const baseMessage = `SignTusk Document Signature:\nDocument Hash: ${documentHash}\nTimestamp: `;
      
      // Try a few common timestamp formats
      const now = new Date();
      const timestamps = [
        now.toISOString(),
        new Date(now.getTime() - 60000).toISOString(), // 1 minute ago
        new Date(now.getTime() - 300000).toISOString(), // 5 minutes ago
      ];
      
      for (const timestamp of timestamps) {
        try {
          const testMessage = baseMessage + timestamp;
          const recoveredAddress = ethers.verifyMessage(testMessage, signature);
          
          if (signerAddress) {
            if (recoveredAddress.toLowerCase() === signerAddress.toLowerCase()) {
              return true;
            }
          } else if (ethers.isAddress(recoveredAddress)) {
            return true;
          }
        } catch (e) {
          // Continue to next timestamp
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Get the signer address from a signature
 * @param documentHash - The hash of the document
 * @param signature - The signature
 * @returns The address of the signer, or null if invalid
 */
export async function getSignerAddress(documentHash: string, signature: string): Promise<string | null> {
  try {
    const message = `SignTusk Document Signature:\nDocument Hash: ${documentHash}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress;
  } catch (error) {
    console.error('Error recovering signer address:', error);
    return null;
  }
}

/**
 * Create a multi-signature proof hash
 * @param documentHash - The original document hash
 * @param signatures - Array of signatures
 * @returns A combined hash representing the multi-signature proof
 */
export function createMultiSignatureProof(documentHash: string, signatures: string[]): string {
  // Sort signatures to ensure consistent ordering
  const sortedSignatures = [...signatures].sort();
  
  // Combine document hash with all signatures
  const combinedData = documentHash + sortedSignatures.join('');
  
  // Create a hash of the combined data
  const proofHash = CryptoJS.SHA256(combinedData).toString();
  
  return proofHash;
}

/**
 * Verify a multi-signature proof
 * @param documentHash - The original document hash
 * @param signatures - Array of signatures to verify
 * @param signerAddresses - Array of expected signer addresses
 * @returns True if all signatures are valid
 */
export async function verifyMultiSignature(
  documentHash: string,
  signatures: string[],
  signerAddresses: string[]
): Promise<boolean> {
  if (signatures.length !== signerAddresses.length) {
    return false;
  }

  try {
    // Verify each signature
    for (let i = 0; i < signatures.length; i++) {
      const isValid = await verifySignature(documentHash, signatures[i], signerAddresses[i]);
      if (!isValid) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying multi-signature:', error);
    return false;
  }
}

/**
 * Generate a signature metadata object
 * @param documentHash - The document hash
 * @param signature - The signature
 * @param signerAddress - The signer's address
 * @param signerId - The signer's custom ID
 * @returns Signature metadata object
 */
export function createSignatureMetadata(
  documentHash: string,
  signature: string,
  signerAddress: string,
  signerId: string
) {
  return {
    documentHash,
    signature,
    signerAddress,
    signerId,
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
}
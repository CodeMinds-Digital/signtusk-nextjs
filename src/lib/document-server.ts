import crypto from 'crypto';

/**
 * Generate a SHA-256 hash of a file (Server-side version)
 * @param file - The file to hash
 * @returns Promise that resolves to the hex-encoded hash
 */
export async function generateDocumentHashServer(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Create hash using Node.js crypto
    const hash = crypto.createHash('sha256');
    hash.update(new Uint8Array(arrayBuffer));
    
    return hash.digest('hex');
  } catch (error) {
    console.error('Error generating document hash:', error);
    throw new Error('Failed to generate document hash');
  }
}

/**
 * Generate a hash from a string (Server-side version)
 * @param content - The string content to hash
 * @returns The hex-encoded hash
 */
export function generateStringHashServer(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generate a hash from binary data (Server-side version)
 * @param data - The binary data as ArrayBuffer or Buffer
 * @returns The hex-encoded hash
 */
export function generateBinaryHashServer(data: ArrayBuffer | Buffer): string {
  const hash = crypto.createHash('sha256');
  
  if (data instanceof ArrayBuffer) {
    hash.update(new Uint8Array(data));
  } else {
    hash.update(data);
  }
  
  return hash.digest('hex');
}

/**
 * Generate a hash from a Blob (Server-side version)
 * @param blob - The blob to hash
 * @returns Promise that resolves to the hex-encoded hash
 */
export async function generateBlobHashServer(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    return generateBinaryHashServer(arrayBuffer);
  } catch (error) {
    console.error('Error generating blob hash:', error);
    throw new Error('Failed to generate blob hash');
  }
}

/**
 * Verify that a file matches a given hash (Server-side version)
 * @param file - The file to verify
 * @param expectedHash - The expected hash
 * @returns Promise that resolves to true if the file matches the hash
 */
export async function verifyDocumentHashServer(file: File, expectedHash: string): Promise<boolean> {
  try {
    const actualHash = await generateDocumentHashServer(file);
    return actualHash === expectedHash;
  } catch (error) {
    console.error('Error verifying document hash:', error);
    return false;
  }
}

/**
 * Get file metadata for document tracking (Server-side version)
 * @param file - The file to analyze
 * @returns Object containing file metadata
 */
export function getFileMetadataServer(file: File) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    lastModifiedDate: new Date(file.lastModified).toISOString()
  };
}

/**
 * Create a document fingerprint combining hash and metadata (Server-side version)
 * @param file - The file to fingerprint
 * @returns Promise that resolves to a comprehensive document fingerprint
 */
export async function createDocumentFingerprintServer(file: File): Promise<{
  hash: string;
  metadata: ReturnType<typeof getFileMetadataServer>;
  fingerprint: string;
}> {
  const hash = await generateDocumentHashServer(file);
  const metadata = getFileMetadataServer(file);
  
  // Create a combined fingerprint
  const fingerprintData = JSON.stringify({
    hash,
    name: metadata.name,
    size: metadata.size,
    type: metadata.type
  });
  
  const fingerprint = generateStringHashServer(fingerprintData);
  
  return {
    hash,
    metadata,
    fingerprint
  };
}

/**
 * Validate file type and size constraints (Server-side version)
 * @param file - The file to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateFileServer(file: File, options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
} = {}): { isValid: boolean; error?: string } {
  const { maxSize = 50 * 1024 * 1024, allowedTypes } = options; // Default 50MB
  
  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size (${formatFileSizeServer(file.size)}) exceeds maximum allowed size (${formatFileSizeServer(maxSize)})`
    };
  }
  
  // Check file type if specified
  if (allowedTypes && allowedTypes.length > 0) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    const isTypeAllowed = allowedTypes.some(type => {
      const normalizedType = type.toLowerCase();
      return (
        mimeType.includes(normalizedType) ||
        fileExtension === normalizedType.replace('.', '') ||
        normalizedType === fileExtension
      );
    });
    
    if (!isTypeAllowed) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Format file size in human-readable format (Server-side version)
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSizeServer(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a document summary for display purposes (Server-side version)
 * @param file - The file to summarize
 * @returns Promise that resolves to document summary
 */
export async function createDocumentSummaryServer(file: File): Promise<{
  name: string;
  size: string;
  type: string;
  hash: string;
}> {
  const hash = await generateDocumentHashServer(file);
  
  return {
    name: file.name,
    size: formatFileSizeServer(file.size),
    type: file.type || 'Unknown',
    hash
  };
}

/**
 * Generate multiple hash algorithms for enhanced security (Server-side version)
 * @param file - The file to hash
 * @returns Promise that resolves to multiple hashes
 */
export async function generateMultipleHashesServer(file: File): Promise<{
  sha256: string;
  sha512: string;
  md5: string;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const sha512 = crypto.createHash('sha512').update(buffer).digest('hex');
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    
    return { sha256, sha512, md5 };
  } catch (error) {
    console.error('Error generating multiple hashes:', error);
    throw new Error('Failed to generate multiple hashes');
  }
}
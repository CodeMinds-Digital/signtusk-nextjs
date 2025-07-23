import CryptoJS from 'crypto-js';

/**
 * Generate a SHA-256 hash of a file
 * @param file - The file to hash
 * @returns Promise that resolves to the hex-encoded hash
 */
export async function generateDocumentHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
        const hash = CryptoJS.SHA256(wordArray).toString();
        resolve(hash);
      } catch (error) {
        reject(new Error('Failed to generate document hash'));
      }
    };
    
    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate a hash from a string
 * @param content - The string content to hash
 * @returns The hex-encoded hash
 */
export function generateStringHash(content: string): string {
  return CryptoJS.SHA256(content).toString();
}

/**
 * Generate a hash from binary data
 * @param data - The binary data as ArrayBuffer
 * @returns The hex-encoded hash
 */
export function generateBinaryHash(data: ArrayBuffer): string {
  const wordArray = CryptoJS.lib.WordArray.create(data);
  return CryptoJS.SHA256(wordArray).toString();
}

/**
 * Verify that a file matches a given hash
 * @param file - The file to verify
 * @param expectedHash - The expected hash
 * @returns Promise that resolves to true if the file matches the hash
 */
export async function verifyDocumentHash(file: File, expectedHash: string): Promise<boolean> {
  try {
    const actualHash = await generateDocumentHash(file);
    return actualHash === expectedHash;
  } catch (error) {
    console.error('Error verifying document hash:', error);
    return false;
  }
}

/**
 * Get file metadata for document tracking
 * @param file - The file to analyze
 * @returns Object containing file metadata
 */
export function getFileMetadata(file: File) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    lastModifiedDate: new Date(file.lastModified).toISOString()
  };
}

/**
 * Create a document fingerprint combining hash and metadata
 * @param file - The file to fingerprint
 * @returns Promise that resolves to a comprehensive document fingerprint
 */
export async function createDocumentFingerprint(file: File): Promise<{
  hash: string;
  metadata: ReturnType<typeof getFileMetadata>;
  fingerprint: string;
}> {
  const hash = await generateDocumentHash(file);
  const metadata = getFileMetadata(file);
  
  // Create a combined fingerprint
  const fingerprintData = JSON.stringify({
    hash,
    name: metadata.name,
    size: metadata.size,
    type: metadata.type
  });
  
  const fingerprint = generateStringHash(fingerprintData);
  
  return {
    hash,
    metadata,
    fingerprint
  };
}

/**
 * Validate file type and size constraints
 * @param file - The file to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateFile(file: File, options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
} = {}): { isValid: boolean; error?: string } {
  const { maxSize = 50 * 1024 * 1024, allowedTypes } = options; // Default 50MB
  
  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
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
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract text content from supported file types
 * @param file - The file to extract text from
 * @returns Promise that resolves to extracted text or null if not supported
 */
export async function extractTextContent(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string || null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    } else {
      // For non-text files, we can't extract content in the browser
      // In a real application, you might use server-side processing
      resolve(null);
    }
  });
}

/**
 * Create a document summary for display purposes
 * @param file - The file to summarize
 * @returns Promise that resolves to document summary
 */
export async function createDocumentSummary(file: File): Promise<{
  name: string;
  size: string;
  type: string;
  hash: string;
  preview?: string;
}> {
  const hash = await generateDocumentHash(file);
  const textContent = await extractTextContent(file);
  
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: file.type || 'Unknown',
    hash,
    preview: textContent ? textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '') : undefined
  };
}
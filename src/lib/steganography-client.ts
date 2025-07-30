/**
 * Client-side steganography service for wallet backup and restore
 */

export interface WalletData {
  mnemonic: string;
  privateKey: string;
  address: string;
  customId?: string;
}

export interface SteganographyBackupOptions {
  walletData: WalletData;
  password: string;
  imageName: string;
  dataType: 'wallet_backup' | 'private_key' | 'mnemonic';
  expiresInDays?: number;
  carrierImage?: File;
}

export interface SteganographyBackupResult {
  success: boolean;
  imageId?: string;
  stegoKey?: string;
  imageName?: string;
  dataType?: string;
  fileSize?: number;
  expiresAt?: string;
  message?: string;
  error?: string;
}

export interface SteganographyExtractOptions {
  stegoImage: File;
  stegoKey: string;
  password: string;
  dataType: 'wallet_backup' | 'private_key' | 'mnemonic';
}

export interface SteganographyExtractResult {
  success: boolean;
  dataType?: string;
  walletData?: {
    address: string;
    customId?: string;
    mnemonic?: string;
    privateKey?: string;
    timestamp?: number;
    version?: string;
  };
  metadata?: {
    extractedAt: string;
    originalTimestamp?: number;
    version?: string;
  };
  message?: string;
  error?: string;
}

export interface SteganographicImage {
  id: string;
  image_name: string;
  data_type: string;
  file_size: number;
  image_format: string;
  created_at: string;
  expires_at?: string;
  download_count: number;
  last_downloaded_at?: string;
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Create steganographic backup of wallet data
 */
export async function createSteganographicBackup(
  options: SteganographyBackupOptions
): Promise<SteganographyBackupResult> {
  try {
    const { walletData, password, imageName, dataType, expiresInDays, carrierImage } = options;

    // Prepare request body
    const requestBody: any = {
      walletData,
      password,
      imageName,
      dataType,
      expiresInDays
    };

    // Convert carrier image to base64 if provided
    if (carrierImage) {
      requestBody.carrierImage = await fileToBase64(carrierImage);
    }

    // Make API request
    const response = await fetch('/api/steganography/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to create steganographic backup'
      };
    }

    return {
      success: true,
      imageId: result.imageId,
      stegoKey: result.stegoKey,
      imageName: result.imageName,
      dataType: result.dataType,
      fileSize: result.fileSize,
      expiresAt: result.expiresAt,
      message: result.message
    };

  } catch (error) {
    console.error('Error creating steganographic backup:', error);
    return {
      success: false,
      error: 'Network error or server unavailable'
    };
  }
}

/**
 * Extract wallet data from steganographic image
 */
export async function extractFromSteganographicImage(
  options: SteganographyExtractOptions
): Promise<SteganographyExtractResult> {
  try {
    const { stegoImage, stegoKey, password, dataType } = options;

    // Convert image to base64
    const imageBase64 = await fileToBase64(stegoImage);

    // Make API request
    const response = await fetch('/api/steganography/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stegoImage: imageBase64,
        stegoKey,
        password,
        dataType
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to extract data from steganographic image'
      };
    }

    return {
      success: true,
      dataType: result.dataType,
      walletData: result.walletData,
      metadata: result.metadata,
      message: result.message
    };

  } catch (error) {
    console.error('Error extracting from steganographic image:', error);
    return {
      success: false,
      error: 'Network error or server unavailable'
    };
  }
}

/**
 * List user's steganographic backups
 */
export async function listSteganographicBackups(): Promise<{
  success: boolean;
  images?: SteganographicImage[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/steganography/list', {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to list steganographic backups'
      };
    }

    return {
      success: true,
      images: result.images
    };

  } catch (error) {
    console.error('Error listing steganographic backups:', error);
    return {
      success: false,
      error: 'Network error or server unavailable'
    };
  }
}

/**
 * Download steganographic image
 */
export async function downloadSteganographicImage(imageId: string): Promise<{
  success: boolean;
  imageBlob?: Blob;
  filename?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/steganography/download/${imageId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorResult = await response.json();
      return {
        success: false,
        error: errorResult.error || 'Failed to download steganographic image'
      };
    }

    const imageBlob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'steganographic-backup.png';

    return {
      success: true,
      imageBlob,
      filename
    };

  } catch (error) {
    console.error('Error downloading steganographic image:', error);
    return {
      success: false,
      error: 'Network error or server unavailable'
    };
  }
}

/**
 * Delete steganographic backup
 */
export async function deleteSteganographicBackup(imageId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/steganography/${imageId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to delete steganographic backup'
      };
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('Error deleting steganographic backup:', error);
    return {
      success: false,
      error: 'Network error or server unavailable'
    };
  }
}

/**
 * Validate image file for steganography
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select a valid image file' };
  }

  // Check supported formats
  const supportedFormats = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!supportedFormats.includes(file.type)) {
    return { valid: false, error: 'Only PNG and JPEG images are supported' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image file must be smaller than 10MB' };
  }

  // Check minimum size (1KB)
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    return { valid: false, error: 'Image file is too small for steganography' };
  }

  return { valid: true };
}

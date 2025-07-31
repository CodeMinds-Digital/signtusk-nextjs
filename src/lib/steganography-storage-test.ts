/**
 * Enhanced steganography storage for testing with real steganographic images
 * Uses file system for persistence across requests
 */

import * as pako from 'pako';
import * as fs from 'fs';
import * as path from 'path';

// File-based storage for steganographic images (for testing)
const STORAGE_DIR = path.join(process.cwd(), 'temp-stego-storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Simple UUID v4 generator for testing
function generateTestUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate random avatar using dicebear
async function generateRandomAvatar(): Promise<Buffer> {
  try {
    const { createAvatar } = await import('@dicebear/core');
    const { avataaars } = await import('@dicebear/collection');
    
    const seed = Math.random().toString(36).substring(7);
    const avatar = createAvatar(avataaars, {
      seed,
      size: 1200,
      backgroundColor: ['b6e3f4','c0aede','d1d4f9','ffd5dc','ffdfbf'],
    });
    
    const svg = avatar.toString();
    
    // Convert SVG to PNG using canvas
    const { createCanvas, loadImage } = require('canvas');
    const canvas = createCanvas(1200, 1200);
    const ctx = canvas.getContext('2d');
    
    // Create a data URL from SVG
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    
    // Load and draw the SVG
    const img = await loadImage(svgDataUrl);
    ctx.drawImage(img, 0, 0, 1200, 1200);
    
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Failed to generate avatar, using fallback:', error);
    
    // Fallback: create a colorful pattern
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(1200, 1200);
    const ctx = canvas.getContext('2d');
    
    // Create a gradient background
    const gradient = ctx.createRadialGradient(600, 600, 0, 600, 600, 600);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.3, '#4ecdc4');
    gradient.addColorStop(0.6, '#45b7d1');
    gradient.addColorStop(1, '#96ceb4');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 1200);
    
    // Add some noise for better steganography
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 1200;
      const y = Math.random() * 1200;
      const size = Math.random() * 3;
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
      ctx.fillRect(x, y, size, size);
    }
    
    return canvas.toBuffer('image/png');
  }
}

/**
 * Create a new steganographic image record with real steganographic data
 */
export async function createSteganographicImage(
  imageBlob: Blob,
  metadata: {
    customId: string;
    walletAddress: string;
    imageName: string;
    originalCarrierName?: string;
    stegoKeyHash: string;
    dataType: 'wallet_backup' | 'private_key' | 'mnemonic' | 'custom_data';
    encryptionVersion: string;
    imageFormat: 'PNG' | 'JPEG' | 'JPG';
    expiresAt?: Date;
    additionalMetadata?: any;
  }
): Promise<{ success: boolean; imageId?: string; error?: string }> {
  try {
    console.log('Creating steganographic image with real data (enhanced test mode):', {
      customId: metadata.customId,
      imageName: metadata.imageName,
      dataType: metadata.dataType,
      fileSize: imageBlob.size
    });

    // Generate a proper UUID for testing
    const imageId = generateTestUUID();
    
    // Generate a random avatar as carrier image
    console.log('Generating random avatar carrier image...');
    const carrierBuffer = await generateRandomAvatar();
    
    // Convert blob to buffer for steganography
    const walletDataBuffer = Buffer.from(await imageBlob.arrayBuffer());
    
    // Compress wallet data before steganography to reduce size
    console.log('Original wallet data size:', walletDataBuffer.length, 'bytes');
    const compressedData = pako.deflate(walletDataBuffer);
    console.log('Compressed wallet data size:', compressedData.length, 'bytes');
    console.log('Compression ratio:', ((1 - compressedData.length / walletDataBuffer.length) * 100).toFixed(1) + '%');
    
    // Convert compressed data to base64 string for steganography
    const compressedDataString = Buffer.from(compressedData).toString('base64');
    console.log('Base64 compressed data size:', compressedDataString.length, 'bytes');
    
    // Create actual steganographic image
    console.log('Creating steganographic image with hidden data...');
    const { hideDataInImage } = await import('./steganography');
    const stegoResult = await hideDataInImage(compressedDataString, carrierBuffer);
    
    // Convert stegoImage blob to buffer for storage
    const stegoBuffer = Buffer.from(await stegoResult.stegoImage.arrayBuffer());
    
    // Store the steganographic image and metadata to files
    const imageData = {
      id: imageId,
      custom_id: metadata.customId,
      image_name: metadata.imageName,
      data_type: metadata.dataType,
      file_size: stegoBuffer.length,
      image_format: 'PNG',
      stego_key: stegoResult.stegoKey,
      original_data: walletDataBuffer,
      created_at: new Date().toISOString(),
      expires_at: metadata.expiresAt?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Save metadata and image to separate files
    fs.writeFileSync(path.join(STORAGE_DIR, `${imageId}.json`), JSON.stringify(imageData));
    fs.writeFileSync(path.join(STORAGE_DIR, `${imageId}.png`), stegoBuffer);
    
    console.log(`✅ Created steganographic image with ID: ${imageId}`);
    console.log(`📊 Stego image size: ${stegoBuffer.length} bytes`);
    console.log(`🔑 Stego key: ${stegoResult.stegoKey}`);

    return { success: true, imageId };
  } catch (error) {
    console.error('Error creating steganographic image:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get steganographic image by ID with real steganographic data
 */
export async function getSteganographicImageById(
  imageId: string,
  customId: string
): Promise<{ success: boolean; image?: any; error?: string }> {
  try {
    console.log('Getting steganographic image (enhanced test mode):', { imageId, customId });
    
    const imageMetaPath = path.join(STORAGE_DIR, `${imageId}.json`);
    const imageDataPath = path.join(STORAGE_DIR, `${imageId}.png`);
    
    let storedImage = null;
    if (fs.existsSync(imageMetaPath) && fs.existsSync(imageDataPath)) {
      storedImage = JSON.parse(fs.readFileSync(imageMetaPath, 'utf8'));
      storedImage.stego_buffer = fs.readFileSync(imageDataPath);
    }
    
    if (!storedImage) {
      return { success: false, error: 'Image not found' };
    }
    
    return {
      success: true,
      image: storedImage
    };
  } catch (error) {
    console.error('Error getting steganographic image:', error);
    return { success: false, error: 'Image not found' };
  }
}

/**
 * Log steganographic access attempt
 */
export async function logSteganographicAccess(
  imageId: string,
  customId: string,
  accessType: 'create' | 'download' | 'view' | 'delete' | 'verify',
  success: boolean = true,
  errorMessage?: string,
  additionalData?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    console.log('Steganographic access log (enhanced test mode):', {
      imageId,
      customId,
      accessType,
      success,
      errorMessage,
      additionalData
    });
  } catch (error) {
    console.error('Error logging steganographic access:', error);
  }
}

/**
 * Update download statistics
 */
export async function updateDownloadStats(
  imageId: string,
  customId: string
): Promise<void> {
  try {
    console.log('Updating download stats (enhanced test mode):', { imageId, customId });
  } catch (error) {
    console.error('Error updating download stats:', error);
  }
}

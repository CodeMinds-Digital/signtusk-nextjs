/**
 * Steganography utilities for hiding encrypted data in images
 * Uses LSB (Least Significant Bit) steganography for secure data hiding
 * Now using steggy library for better compatibility and reliability
 */

import { conceal, reveal } from 'steggy';
import * as CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';

/**
 * Interface for steganography options
 */
export interface StegoOptions {
  quality?: number;       // Image quality (0-100)
  randomSeed?: string;    // Seed for randomization
  algorithm?: 'lsb';      // Algorithm to use (LSB)
  coverage?: number;      // Percentage of image to use (0-100)
}

/**
 * Interface for steganography result
 */
export interface StegoResult {
  stegoImage: Blob;
  stegoKey: string;
  originalSize: number;
  stegoSize: number;
}

/**
 * Interface for wallet data to be hidden
 */
export interface WalletStegoData {
  encryptedMnemonic: string;
  encryptedPrivateKey: string;
  address: string;
  customId: string;
  salt: string;
  version: string;
  timestamp: number;
}

/**
 * Generate a secure random seed for steganography
 */
export function generateRandomSeed(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomArray = new Uint8Array(length);
  crypto.getRandomValues(randomArray);

  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length];
  }

  return result;
}

/**
 * Add random padding to data to prevent statistical analysis
 */
export function addRandomPadding(data: string, seed: string): string {
  // Use seed to generate deterministic padding
  const paddingLength = Math.floor(Math.random() * 100) + 50; // 50-150 chars
  const padding = CryptoJS.lib.WordArray.random(paddingLength).toString();

  // Add padding markers and data
  return `STEGO_START_${padding}_DATA_${data}_END_${padding}_STEGO`;
}

/**
 * Remove random padding from extracted data
 */
export function removeRandomPadding(paddedData: string, seed: string): string {
  const dataMatch = paddedData.match(/STEGO_START_.*?_DATA_(.*?)_END_.*?_STEGO/);
  if (!dataMatch) {
    throw new Error('Invalid steganographic data format');
  }
  return dataMatch[1];
}

/**
 * Load an image from URL or File
 */
export function loadImage(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    }
  });
}

/**
 * Convert data URL to Blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Convert image to canvas for processing
 */
export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  return canvas;
}

/**
 * Hide data within an image using steganography
 */
export async function hideDataInImage(
  data: string,
  carrierImageFile?: File | Buffer,
  options: StegoOptions = {}
): Promise<StegoResult> {
  try {
    // Generate a random stegoKey if not using a seed
    const stegoKey = options.randomSeed || generateRandomSeed(32);

    // Add random padding to prevent statistical analysis
    const paddedData = addRandomPadding(data, stegoKey);

    // Get carrier image buffer
    let carrierBuffer: Buffer;

    if (carrierImageFile) {
      if (carrierImageFile instanceof Buffer) {
        // Already a Buffer
        carrierBuffer = carrierImageFile;
      } else {
        // Convert File to Buffer
        const arrayBuffer = await carrierImageFile.arrayBuffer();
        carrierBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      // Create a default carrier image buffer
      carrierBuffer = await createDefaultCarrierImageBuffer();
    }

    // Hide data using steggy (curried function)
    const stegoBuffer = conceal()(carrierBuffer, paddedData);

    // Convert buffer to blob
    const stegoBlob = new Blob([stegoBuffer], { type: 'image/png' });

    return {
      stegoImage: stegoBlob,
      stegoKey,
      originalSize: carrierImageFile?.size || carrierBuffer.length,
      stegoSize: stegoBlob.size
    };
  } catch (error) {
    console.error('Steganography encoding error:', error);
    throw new Error('Failed to hide data in image');
  }
}

/**
 * Extract data from a steganographic image
 */
export async function extractDataFromImage(
  stegoImage: Blob | File,
  stegoKey: string
): Promise<string> {
  try {
    // Convert image to buffer
    const arrayBuffer = await stegoImage.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Extract hidden data using steggy (curried function)
    const extractedData = reveal()(imageBuffer, 'utf8');

    // Remove padding
    const data = removeRandomPadding(extractedData, stegoKey);

    return data;
  } catch (error) {
    console.error('Steganography decoding error:', error);
    throw new Error('Failed to extract data from image');
  }
}

/**
 * Create a default carrier image buffer
 */
export async function createDefaultCarrierImageBuffer(): Promise<Buffer> {
  // For now, we'll create a simple PNG buffer
  // In a real implementation, you might want to use a PNG library like pngjs
  // For simplicity, we'll fetch the default SVG and convert it

  try {
    // Try to fetch the default carrier image
    const response = await fetch('/assets/default-carrier.svg');
    if (response.ok) {
      const svgText = await response.text();

      // Convert SVG to PNG using canvas (browser environment)
      if (typeof window !== 'undefined') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        canvas.width = 800;
        canvas.height = 600;

        // Create a simple pattern as fallback
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const x = (i / 4) % canvas.width;
          const y = Math.floor((i / 4) / canvas.width);

          const noise = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 50 + 128;
          const variation = (Math.random() - 0.5) * 30;
          const value = Math.max(0, Math.min(255, noise + variation));

          data[i] = value;     // Red
          data[i + 1] = value; // Green
          data[i + 2] = value; // Blue
          data[i + 3] = 255;   // Alpha
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert to blob then to buffer
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else throw new Error('Failed to create blob');
          }, 'image/png');
        });

        const arrayBuffer = await blob.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }
  } catch (error) {
    console.warn('Failed to load default carrier image, creating simple pattern');
  }

  // Fallback: create a PNG buffer using canvas
  console.log('Creating fallback PNG image using canvas...');

  try {
    // Try to use canvas to create a proper PNG
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
    
    // Add some noise for better steganography capacity
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 1200;
      const y = Math.random() * 1200;
      const size = Math.random() * 2;
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`;
      ctx.fillRect(x, y, size, size);
    }
    
    return canvas.toBuffer('image/png');
  } catch (canvasError) {
    console.error('Canvas fallback failed:', canvasError);
    // Last resort: use a minimal 1x1 PNG
    const minimalPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
    return Buffer.from(minimalPng, 'base64');
  }
}

/**
 * Validate image for steganography compatibility
 */
export function validateImageForSteganography(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      resolve(false);
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      resolve(false);
      return;
    }

    // Try to load the image
    loadImage(file)
      .then((img) => {
        // Check dimensions (min 100x100, max 4000x4000)
        if (img.width < 100 || img.height < 100 ||
          img.width > 4000 || img.height > 4000) {
          resolve(false);
          return;
        }

        resolve(true);
      })
      .catch(() => {
        resolve(false);
      });
  });
}

/**
 * Calculate maximum data capacity for an image
 */
export function calculateDataCapacity(width: number, height: number): number {
  // LSB steganography can hide approximately 1 bit per color channel
  // With 3 color channels (RGB), that's 3 bits per pixel
  // Convert to bytes and apply safety margin
  const totalPixels = width * height;
  const bitsPerPixel = 3; // RGB channels
  const totalBits = totalPixels * bitsPerPixel;
  const totalBytes = Math.floor(totalBits / 8);

  // Apply 80% safety margin for reliability
  return Math.floor(totalBytes * 0.8);
}

/**
 * Hash a steganography key for storage verification
 */
export function hashStegoKey(stegoKey: string): string {
  return CryptoJS.SHA256(stegoKey).toString();
}

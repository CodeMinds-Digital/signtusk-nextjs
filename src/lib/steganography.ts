/**
 * Custom steganography implementation using LSB (Least Significant Bit) technique
 * Hides data within images for Zero Trust security implementation
 */

/**
 * Interface for steganography options
 */
interface StegoOptions {
  quality?: number;       // Image quality (0-100)
  randomSeed?: string;    // Seed for randomization
  coverage?: number;      // Percentage of image to use (0-100)
}

/**
 * Default carrier image to use when none is provided
 */
const DEFAULT_CARRIER_IMAGE = '/assets/default-carrier.png';

/**
 * Hide data within an image using LSB steganography
 */
export async function hideDataInImage(
  data: string,
  carrierImageFile?: File,
  options: StegoOptions = {}
): Promise<{ stegoImage: Blob; stegoKey: string }> {
  try {
    // Generate a seed for avatar generation if no carrier image provided
    const avatarSeed = options.randomSeed || `stego-${Date.now()}-${Math.random()}`;

    // Use provided image or generate avatar
    const canvas = await loadImageToCanvas(carrierImageFile, avatarSeed);
    const ctx = canvas.getContext('2d')!;

    // Generate a random stegoKey if not using a seed
    const stegoKey = options.randomSeed || generateRandomSeed(32);

    // Add random padding to prevent statistical analysis
    const paddedData = addRandomPadding(data, stegoKey);

    // Convert data to binary
    const binaryData = stringToBinary(paddedData);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Check if image is large enough to hold the data
    const maxDataBits = Math.floor(pixels.length / 4) * 3; // 3 color channels per pixel
    if (binaryData.length > maxDataBits) {
      throw new Error('Image too small to hide the data');
    }

    // Hide data in LSBs of RGB channels (skip alpha)
    let dataIndex = 0;
    for (let i = 0; i < pixels.length && dataIndex < binaryData.length; i += 4) {
      // Red channel
      if (dataIndex < binaryData.length) {
        pixels[i] = (pixels[i] & 0xFE) | parseInt(binaryData[dataIndex], 2);
        dataIndex++;
      }
      // Green channel
      if (dataIndex < binaryData.length) {
        pixels[i + 1] = (pixels[i + 1] & 0xFE) | parseInt(binaryData[dataIndex], 2);
        dataIndex++;
      }
      // Blue channel
      if (dataIndex < binaryData.length) {
        pixels[i + 2] = (pixels[i + 2] & 0xFE) | parseInt(binaryData[dataIndex], 2);
        dataIndex++;
      }
      // Skip alpha channel (i + 3)
    }

    // Put modified image data back
    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to Blob
    const stegoImage = await canvasToBlob(canvas, options.quality || 90);

    return { stegoImage, stegoKey };
  } catch (error) {
    console.error('Steganography encoding error:', error);
    throw new Error('Failed to hide data in image');
  }
}

/**
 * Extract data from a stego image
 */
export async function extractDataFromImage(
  stegoImage: Blob | File,
  stegoKey: string
): Promise<string> {
  try {
    // Load stego image to canvas
    const canvas = await loadImageToCanvas(stegoImage);
    const ctx = canvas.getContext('2d')!;

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Extract binary data from LSBs
    let binaryData = '';
    for (let i = 0; i < pixels.length; i += 4) {
      // Extract from RGB channels
      binaryData += (pixels[i] & 1).toString();         // Red
      binaryData += (pixels[i + 1] & 1).toString();     // Green
      binaryData += (pixels[i + 2] & 1).toString();     // Blue
    }

    // Convert binary to string
    const extractedData = binaryToString(binaryData);

    // Remove padding
    const data = removeRandomPadding(extractedData, stegoKey);

    return data;
  } catch (error) {
    console.error('Steganography decoding error:', error);
    throw new Error('Failed to extract data from image');
  }
}

/**
 * Load image to canvas
 */
async function loadImageToCanvas(imageSource?: File | Blob, seed?: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (imageSource) {
    // Load provided image
    const img = await loadImage(URL.createObjectURL(imageSource));
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  } else {
    // Generate a unique avatar image using multiavatar
    try {
      console.log('No carrier image provided, generating avatar...');
      const { generateAvatarWithFallback } = await import('./avatar-generator');

      // Use seed or generate one from current timestamp
      const avatarSeed = seed || `steganography-${Date.now()}`;
      const avatarBlob = await generateAvatarWithFallback(avatarSeed, 512);

      // Load the generated avatar
      const img = await loadImage(URL.createObjectURL(avatarBlob));
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      console.log('Avatar generated and loaded successfully');
    } catch (error) {
      console.error('Failed to generate avatar, using fallback pattern:', error);

      // Fallback to simple pattern if avatar generation fails
      canvas.width = 512;
      canvas.height = 512;

      // Create a simple pattern as default carrier
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#4F46E5');
      gradient.addColorStop(0.5, '#7C3AED');
      gradient.addColorStop(1, '#EC4899');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add some noise to make it more suitable for steganography
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 3 + 1;

        ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  return canvas;
}

/**
 * Load an image from URL
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Convert canvas to Blob
 */
async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png', quality / 100);
  });
}

/**
 * Convert string to binary representation
 */
function stringToBinary(str: string): string {
  return str.split('').map(char =>
    char.charCodeAt(0).toString(2).padStart(8, '0')
  ).join('');
}

/**
 * Convert binary representation to string
 */
function binaryToString(binary: string): string {
  let result = '';
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substr(i, 8);
    if (byte.length === 8) {
      const charCode = parseInt(byte, 2);
      if (charCode === 0) break; // End of data marker
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

/**
 * Generate a random seed for steganography
 */
function generateRandomSeed(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  // Use crypto API for better randomness if available
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += characters.charAt(values[i] % charactersLength);
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
  }

  return result;
}

/**
 * Add random padding to data to prevent statistical analysis
 */
function addRandomPadding(data: string, seed: string): string {
  // Use the seed to generate deterministic padding
  const paddingLength = hashCode(seed) % 1000 + 500; // 500-1500 bytes of padding
  const padding = generatePaddingData(paddingLength, seed);

  // Format: [padding length as 6 digits][data][padding][null terminator]
  return `${paddingLength.toString().padStart(6, '0')}${data}${padding}\0`;
}

/**
 * Remove random padding from extracted data
 */
function removeRandomPadding(paddedData: string, seed: string): string {
  // Extract padding length from first 6 characters
  const paddingLength = parseInt(paddedData.substring(0, 6), 10);

  // Extract the actual data (everything between the length prefix and the padding)
  const data = paddedData.substring(6, paddedData.length - paddingLength - 1); // -1 for null terminator

  return data;
}

/**
 * Generate deterministic padding data based on seed
 */
function generatePaddingData(length: number, seed: string): string {
  let result = '';
  const seedHash = hashCode(seed);

  for (let i = 0; i < length; i++) {
    // Use a simple PRNG based on the seed
    const charCode = ((seedHash * (i + 1)) % 94) + 33; // Printable ASCII
    result += String.fromCharCode(charCode);
  }

  return result;
}

/**
 * Simple hash function for seeds
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

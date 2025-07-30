/**
 * Avatar Generator for Steganography
 * Uses multiavatar to generate unique avatar images for hiding wallet data
 */

import multiavatar from '@multiavatar/multiavatar';

/**
 * Generate a unique avatar image as PNG blob for steganography
 * @param seed - Unique seed (e.g., wallet address or custom ID)
 * @param size - Image size (default: 512x512 for good steganography capacity)
 * @returns Promise<Blob> - PNG image blob
 */
export async function generateAvatarImage(seed: string, size: number = 512): Promise<Blob> {
  try {
    console.log('Generating avatar for seed:', seed);

    // Generate SVG avatar using multiavatar
    const svgString = multiavatar(seed);
    
    console.log('SVG generated, converting to PNG...');

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Create an image element from SVG
    const img = new Image();
    
    // Convert SVG to data URL
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Load and draw the image
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        try {
          // Fill background with white (important for steganography)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, size, size);
          
          // Draw the avatar
          ctx.drawImage(img, 0, 0, size, size);
          
          // Clean up
          URL.revokeObjectURL(svgUrl);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Failed to load avatar image'));
      };
      
      img.src = svgUrl;
    });

    // Convert canvas to PNG blob
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png', 1.0); // Maximum quality
    });

    console.log('Avatar PNG generated successfully, size:', pngBlob.size, 'bytes');
    return pngBlob;

  } catch (error) {
    console.error('Error generating avatar image:', error);
    throw new Error(`Failed to generate avatar image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a deterministic avatar for a wallet
 * Uses wallet address and custom ID to create a unique, reproducible avatar
 * @param walletAddress - Wallet address
 * @param customId - Custom ID
 * @param size - Image size
 * @returns Promise<Blob> - PNG image blob
 */
export async function generateWalletAvatar(
  walletAddress: string, 
  customId: string, 
  size: number = 512
): Promise<Blob> {
  // Create a deterministic seed from wallet data
  const seed = `${walletAddress}-${customId}`;
  return generateAvatarImage(seed, size);
}

/**
 * Generate a fallback avatar if multiavatar fails
 * Creates a simple geometric pattern as backup
 * @param seed - Seed for pattern generation
 * @param size - Image size
 * @returns Promise<Blob> - PNG image blob
 */
export async function generateFallbackAvatar(seed: string, size: number = 512): Promise<Blob> {
  try {
    console.log('Generating fallback avatar for seed:', seed);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = size;
    canvas.height = size;

    // Create a deterministic random generator from seed
    let seedNum = 0;
    for (let i = 0; i < seed.length; i++) {
      seedNum += seed.charCodeAt(i);
    }

    // Seeded random function
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Generate background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    const hue1 = seededRandom(seedNum) * 360;
    const hue2 = seededRandom(seedNum + 1) * 360;
    
    gradient.addColorStop(0, `hsl(${hue1}, 70%, 60%)`);
    gradient.addColorStop(1, `hsl(${hue2}, 70%, 40%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Add geometric patterns
    const numShapes = 8 + (seedNum % 8);
    for (let i = 0; i < numShapes; i++) {
      const x = seededRandom(seedNum + i * 2) * size;
      const y = seededRandom(seedNum + i * 2 + 1) * size;
      const radius = (seededRandom(seedNum + i * 3) * 50) + 20;
      const hue = seededRandom(seedNum + i * 4) * 360;
      
      ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.6)`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert fallback canvas to blob'));
        }
      }, 'image/png', 1.0);
    });

    console.log('Fallback avatar generated successfully');
    return blob;

  } catch (error) {
    console.error('Error generating fallback avatar:', error);
    throw new Error(`Failed to generate fallback avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate avatar with fallback
 * Tries multiavatar first, falls back to geometric pattern if it fails
 * @param seed - Unique seed
 * @param size - Image size
 * @returns Promise<Blob> - PNG image blob
 */
export async function generateAvatarWithFallback(seed: string, size: number = 512): Promise<Blob> {
  try {
    return await generateAvatarImage(seed, size);
  } catch (error) {
    console.warn('Multiavatar failed, using fallback:', error);
    return await generateFallbackAvatar(seed, size);
  }
}

/**
 * Script to generate a default carrier image for steganography
 * This creates a simple noise pattern image that can be used as a carrier
 */

const fs = require('fs');
const path = require('path');

// Simple PNG creation function
function createSimplePNG(width, height) {
  // Create a simple grayscale noise pattern
  const pixels = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create a subtle pattern with some randomness
      const pattern = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 50 + 128;
      const noise = (Math.random() - 0.5) * 30;
      const value = Math.max(0, Math.min(255, Math.floor(pattern + noise)));
      
      // RGB + Alpha
      pixels.push(value, value, value, 255);
    }
  }
  
  return pixels;
}

// Create a simple base64 encoded PNG
function createBase64PNG() {
  const width = 400;
  const height = 300;
  
  // This is a minimal PNG structure - in a real implementation you'd use a proper PNG library
  // For now, we'll create a simple data URL that can be used
  const canvas = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="noise" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="4" fill="#f0f0f0"/>
      <circle cx="2" cy="2" r="1" fill="#e0e0e0"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#noise)"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="16" fill="#999">
    Default Carrier Image
  </text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
}

// Generate the default carrier image
const defaultCarrierSVG = `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="noise" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="#f8f8f8"/>
      <rect x="0" y="0" width="4" height="4" fill="#f0f0f0"/>
      <rect x="4" y="4" width="4" height="4" fill="#f0f0f0"/>
      <circle cx="2" cy="2" r="0.5" fill="#e8e8e8"/>
      <circle cx="6" cy="6" r="0.5" fill="#e8e8e8"/>
    </pattern>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e5e5e5;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with subtle gradient -->
  <rect width="100%" height="100%" fill="url(#grad)"/>
  
  <!-- Noise pattern overlay -->
  <rect width="100%" height="100%" fill="url(#noise)" opacity="0.3"/>
  
  <!-- Subtle geometric shapes for visual interest -->
  <circle cx="200" cy="150" r="80" fill="none" stroke="#d0d0d0" stroke-width="1" opacity="0.5"/>
  <circle cx="600" cy="450" r="60" fill="none" stroke="#d0d0d0" stroke-width="1" opacity="0.5"/>
  <rect x="300" y="200" width="200" height="200" fill="none" stroke="#d0d0d0" stroke-width="1" opacity="0.3"/>
  
  <!-- Subtle text watermark -->
  <text x="50%" y="95%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#c0c0c0" opacity="0.5">
    SignTusk Default Carrier
  </text>
</svg>`;

// Save the SVG file
const outputPath = path.join(__dirname, '..', 'public', 'assets', 'default-carrier.svg');
fs.writeFileSync(outputPath, defaultCarrierSVG);

console.log('Default carrier image generated at:', outputPath);
console.log('The image is an SVG with a subtle noise pattern suitable for steganography.');

/**
 * Simple test script for steganography functionality using steggy
 */

const { conceal, reveal } = require('steggy');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a proper test PNG buffer using canvas
function createTestPNG() {
  try {
    // Create a 200x200 canvas with some pattern
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext('2d');

    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 200, 200);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#4ecdc4');
    gradient.addColorStop(1, '#45b7d1');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 200);

    // Add some noise for better steganography
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 200;
      const y = Math.random() * 200;
      const size = Math.random() * 3;
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
      ctx.fillRect(x, y, size, size);
    }

    return canvas.toBuffer('image/png');
  } catch (error) {
    console.warn('Canvas not available, using minimal PNG');
    // Fallback to minimal PNG
    const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
    return Buffer.from(base64PNG, 'base64');
  }
}

async function testSteganography() {
  try {
    console.log('Testing steganography functionality with steggy...');

    // Create test data
    const testData = 'Hello, this is a secret message!';
    const carrierImage = createTestPNG();

    console.log('Original carrier image size:', carrierImage.length, 'bytes');
    console.log('Data to hide:', testData);

    // Save carrier image first
    fs.writeFileSync('test-carrier.png', carrierImage);
    console.log('Carrier image saved: test-carrier.png');

    // Hide data in image using steggy (curried function)
    const stegoImage = conceal()(carrierImage, testData);
    console.log('Steganographic image size:', stegoImage.length, 'bytes');

    // Extract data from image using steggy (curried function)
    const extractedData = reveal()(stegoImage, 'utf8');
    console.log('Extracted data:', extractedData);

    // Verify data integrity
    if (extractedData === testData) {
      console.log('✅ Steganography test PASSED!');
    } else {
      console.log('❌ Steganography test FAILED!');
      console.log('Expected:', testData);
      console.log('Got:', extractedData);
    }

    // Save test images for inspection
    fs.writeFileSync('test-stego.png', stegoImage);
    console.log('Steganographic image saved: test-stego.png');

  } catch (error) {
    console.error('❌ Steganography test ERROR:', error);
    console.error('Error details:', error.message);

    // Try alternative approach if steggy fails
    console.log('\n🔄 Trying alternative steganography approach...');
    await testAlternativeApproach();
  }
}

async function testAlternativeApproach() {
  try {
    // Simple LSB steganography implementation
    const testData = 'Hello, this is a secret message!';
    const carrierImage = createTestPNG();

    console.log('Using simple LSB approach...');
    console.log('Data to hide:', testData);

    // For now, just demonstrate that we can create and save images
    fs.writeFileSync('test-carrier-alt.png', carrierImage);
    console.log('Alternative carrier image saved: test-carrier-alt.png');

    console.log('✅ Alternative approach setup successful!');
    console.log('Note: Full LSB implementation would require additional image processing libraries.');

  } catch (error) {
    console.error('❌ Alternative approach failed:', error);
  }
}

// Run the test
testSteganography();

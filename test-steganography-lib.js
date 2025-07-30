/**
 * Comprehensive test for the updated steganography library
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Import our steganography functions (we'll need to compile TypeScript first)
// For now, let's test the core functionality

const { conceal, reveal } = require('steggy');

// Create a proper test PNG buffer using canvas
function createTestPNG(width = 300, height = 300) {
  try {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Create a complex pattern for better steganography capacity
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.3, '#4ecdc4');
    gradient.addColorStop(0.6, '#45b7d1');
    gradient.addColorStop(1, '#96ceb4');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add geometric patterns
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 50 + 10, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    // Add noise for better steganography
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2;
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`;
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

// Test different data types and sizes
async function runComprehensiveTests() {
  console.log('🧪 Running comprehensive steganography tests...\n');
  
  const tests = [
    {
      name: 'Short Text Message',
      data: 'Hello, World!',
      description: 'Basic text message'
    },
    {
      name: 'Long Text Message',
      data: 'This is a much longer message that contains multiple sentences and should test the capacity of our steganography implementation. It includes various characters, numbers like 123456, and symbols like @#$%^&*()!',
      description: 'Extended text with special characters'
    },
    {
      name: 'JSON Data',
      data: JSON.stringify({
        type: 'wallet_backup',
        mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        timestamp: Date.now(),
        version: 'v2'
      }),
      description: 'Structured JSON data'
    },
    {
      name: 'Unicode Text',
      data: 'Hello 世界! 🌍 Здравствуй мир! مرحبا بالعالم!',
      description: 'Unicode characters and emojis'
    },
    {
      name: 'Base64 Data',
      data: Buffer.from('This is binary data that has been base64 encoded').toString('base64'),
      description: 'Base64 encoded binary data'
    }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`📝 Test ${i + 1}/${totalTests}: ${test.name}`);
    console.log(`   Description: ${test.description}`);
    console.log(`   Data length: ${test.data.length} characters`);
    
    try {
      // Create carrier image
      const carrierImage = createTestPNG(400, 400);
      console.log(`   Carrier image size: ${carrierImage.length} bytes`);
      
      // Hide data
      const stegoImage = conceal()(carrierImage, test.data);
      console.log(`   Steganographic image size: ${stegoImage.length} bytes`);
      
      // Extract data
      const extractedData = reveal()(stegoImage, 'utf8');
      
      // Verify
      if (extractedData === test.data) {
        console.log(`   ✅ PASSED - Data extracted correctly`);
        passedTests++;
        
        // Save test images
        fs.writeFileSync(`test-${i + 1}-carrier.png`, carrierImage);
        fs.writeFileSync(`test-${i + 1}-stego.png`, stegoImage);
        
      } else {
        console.log(`   ❌ FAILED - Data mismatch`);
        console.log(`   Expected length: ${test.data.length}`);
        console.log(`   Extracted length: ${extractedData.length}`);
        console.log(`   First 100 chars expected: ${test.data.substring(0, 100)}`);
        console.log(`   First 100 chars extracted: ${extractedData.substring(0, 100)}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Steganography library is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
  
  return passedTests === totalTests;
}

// Test capacity limits
async function testCapacityLimits() {
  console.log('\n🔍 Testing capacity limits...');
  
  const carrierImage = createTestPNG(500, 500);
  console.log(`Carrier image size: ${carrierImage.length} bytes`);
  
  // Estimate theoretical capacity (rough calculation)
  // PNG images have RGB channels, each can hide ~1 bit per channel
  const estimatedCapacity = (500 * 500 * 3) / 8; // bits to bytes
  console.log(`Estimated theoretical capacity: ~${Math.floor(estimatedCapacity)} bytes`);
  
  // Test with increasingly large messages
  const testSizes = [100, 500, 1000, 2000, 5000, 10000];
  
  for (const size of testSizes) {
    const testData = 'A'.repeat(size);
    console.log(`Testing with ${size} character message...`);
    
    try {
      const stegoImage = conceal()(carrierImage, testData);
      const extractedData = reveal()(stegoImage, 'utf8');
      
      if (extractedData === testData) {
        console.log(`  ✅ ${size} characters: SUCCESS`);
      } else {
        console.log(`  ❌ ${size} characters: FAILED (data corruption)`);
        break;
      }
    } catch (error) {
      console.log(`  ❌ ${size} characters: ERROR - ${error.message}`);
      break;
    }
  }
}

// Run all tests
async function main() {
  console.log('🚀 Starting Steganography Library Tests\n');
  
  const basicTestsPassed = await runComprehensiveTests();
  
  if (basicTestsPassed) {
    await testCapacityLimits();
  }
  
  console.log('\n✨ Testing complete!');
}

// Execute tests
main().catch(console.error);

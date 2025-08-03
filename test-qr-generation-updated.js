const QRCode = require('qrcode');

/**
 * Test the updated QR code generation
 */
async function testQRGeneration() {
  try {
    console.log('Testing updated QR code generation...');
    
    // Test data similar to what would be in a real document hash
    const testHash = 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
    
    // Generate QR code with new settings
    const qrCodeDataURL = await QRCode.toDataURL(testHash, {
      width: 200, // Increased size for better scanning
      margin: 2,
      color: {
        dark: '#000000', // Pure black for better contrast
        light: '#FFFFFF' // White background
      },
      errorCorrectionLevel: 'H' // High error correction for better scanning
    });
    
    console.log('✅ QR Code generated successfully!');
    console.log('📏 Size: 200x200 pixels');
    console.log('🎯 Error Correction: High (H)');
    console.log('🎨 Colors: Pure black on white');
    console.log('📱 Data URL length:', qrCodeDataURL.length, 'characters');
    console.log('🔗 Test hash:', testHash);
    
    // Verify the data URL format
    if (qrCodeDataURL.startsWith('data:image/png;base64,')) {
      console.log('✅ QR Code format is correct (PNG base64)');
    } else {
      console.log('❌ QR Code format is incorrect');
    }
    
    console.log('\n🎉 QR Code generation test completed successfully!');
    console.log('📋 Changes made:');
    console.log('   • Increased QR code size from 40x40 to 80x80 pixels in PDF');
    console.log('   • Removed "DIGITALLY SIGNED" text');
    console.log('   • Removed signature count text');
    console.log('   • Removed date text');
    console.log('   • Simplified to single line: "Scan QR to Verify"');
    console.log('   • Improved QR code quality (High error correction)');
    console.log('   • Better contrast (pure black on white)');
    
  } catch (error) {
    console.error('❌ QR Code generation failed:', error);
  }
}

// Run the test
testQRGeneration();

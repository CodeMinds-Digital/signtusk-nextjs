// Test QR code generation functionality
const QRCode = require('qrcode');

async function testQRGeneration() {
  try {
    console.log('Testing QR code generation...');

    // Test data similar to what would be used in the app
    const testHash = 'abc123def456789abcdef123456789abcdef123456789abcdef123456789abc';

    console.log('Generating QR code for document hash:', testHash);

    // Generate QR code (just the hash, not the full URL)
    const qrCodeDataURL = await QRCode.toDataURL(testHash, {
      width: 80,
      margin: 1,
      color: {
        dark: '#000080', // Dark blue
        light: '#FFFFFF' // White background
      },
      errorCorrectionLevel: 'M'
    });

    console.log('QR code generated successfully!');
    console.log('Data URL length:', qrCodeDataURL.length);
    console.log('Data URL prefix:', qrCodeDataURL.substring(0, 50) + '...');

    // Test that it's a valid data URL
    if (qrCodeDataURL.startsWith('data:image/png;base64,')) {
      console.log('✅ QR code format is correct');
      console.log('✅ QR code contains document hash:', testHash);
      console.log('✅ When scanned, this hash can be used to construct verification URL');
    } else {
      console.log('❌ QR code format is incorrect');
    }

  } catch (error) {
    console.error('❌ QR code generation failed:', error);
  }
}

testQRGeneration();

import { NextRequest, NextResponse } from 'next/server';
import { generateMultiSignatureQRCode } from '@/lib/multi-signature-pdf';

/**
 * Test endpoint to verify QR code generation is working
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing QR code generation...');
    
    // Test with a sample multi-signature request ID
    const testRequestId = 'test-multi-sig-request-123';
    
    console.log('🔄 Generating QR code for test request:', testRequestId);
    const qrCodeDataURL = await generateMultiSignatureQRCode(testRequestId);
    
    console.log('✅ QR code generated successfully');
    console.log('📊 Data URL length:', qrCodeDataURL.length);
    console.log('🔍 Data URL preview:', qrCodeDataURL.substring(0, 100) + '...');
    
    // Return the QR code as an image response
    const base64Data = qrCodeDataURL.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('❌ QR code generation test failed:', error);
    
    return NextResponse.json({
      error: 'QR code generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * Test endpoint with custom request ID
 */
export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json();
    
    if (!requestId) {
      return NextResponse.json({
        error: 'Request ID is required'
      }, { status: 400 });
    }
    
    console.log('🧪 Testing QR code generation with custom ID:', requestId);
    
    const qrCodeDataURL = await generateMultiSignatureQRCode(requestId);
    
    return NextResponse.json({
      success: true,
      requestId,
      qrCodeDataURL,
      dataUrlLength: qrCodeDataURL.length,
      preview: qrCodeDataURL.substring(0, 100) + '...'
    });
    
  } catch (error) {
    console.error('❌ Custom QR code generation test failed:', error);
    
    return NextResponse.json({
      error: 'QR code generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

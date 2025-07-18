import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const { message, signature, address } = await request.json();

    if (!message || !signature || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: message, signature, address' },
        { status: 400 }
      );
    }

    // Verify the signature
    const recoveredAddress = verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Create a simple session token (in production, use proper JWT or session management)
    const sessionToken = Buffer.from(
      JSON.stringify({
        address,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      })
    ).toString('base64');

    return NextResponse.json({
      success: true,
      sessionToken,
      address: recoveredAddress
    });

  } catch (error) {
    console.error('Signature verification error:', error);
    return NextResponse.json(
      { error: 'Signature verification failed' },
      { status: 500 }
    );
  }
}
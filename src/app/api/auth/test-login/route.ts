import { NextRequest, NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';

/**
 * Test login endpoint to simulate authentication
 * Only works in development mode
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if ((process.env.NODE_ENV as string) === 'production') {
    return NextResponse.json(
      { error: 'Test endpoints not available in production' },
      { status: 403 }
    );
  }

  try {
    const { wallet_address, custom_id } = await request.json();

    const testWalletAddress = wallet_address || '0x1234567890123456789012345678901234567890';
    const testCustomId = custom_id || 'TEST123DEMO456';

    // Create JWT token
    const token = signJWT({
      wallet_address: testWalletAddress,
      custom_id: testCustomId
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Test authentication created',
      wallet_address: testWalletAddress
    });

    // Set auth cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: (process.env.NODE_ENV as string) === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json(
      { error: 'Test login failed' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';

/**
 * Clear authentication cookies and session data
 * Useful for debugging or forcing logout
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Authentication cookies cleared'
    });

    // Clear all possible auth cookies
    response.cookies.set('auth-token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    response.cookies.set('session_token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return response;

  } catch (error) {
    console.error('Error clearing auth cookies:', error);
    return NextResponse.json(
      { error: 'Failed to clear authentication cookies' },
      { status: 500 }
    );
  }
}
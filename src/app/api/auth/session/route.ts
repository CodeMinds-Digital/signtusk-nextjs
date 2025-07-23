import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session-management';
import { UserIdentityService } from '@/lib/user-identity';

/**
 * GET - Validate current session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionToken = SessionManager.extractSessionToken(request);
    
    if (!sessionToken) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No session token provided' 
        },
        { status: 401 }
      );
    }

    const userIdentity = await SessionManager.validateSession(sessionToken);
    
    if (!userIdentity) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired session' 
        },
        { status: 401 }
      );
    }

    // Update last login
    await UserIdentityService.updateLastLogin(userIdentity.custom_id);

    return NextResponse.json({
      success: true,
      user: {
        custom_id: userIdentity.custom_id,
        wallet_address: userIdentity.wallet_address,
        display_name: userIdentity.display_name,
        email: userIdentity.email,
        last_login: userIdentity.last_login
      }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new session (login)
 */
export async function POST(request: NextRequest) {
  try {
    const { wallet_address } = await request.json();

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Missing wallet_address' },
        { status: 400 }
      );
    }

    // Get user identity
    const userIdentity = await UserIdentityService.getUserByWalletAddress(wallet_address);
    
    if (!userIdentity) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Extract client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create session
    const sessionToken = await SessionManager.createSession(
      userIdentity,
      clientIP,
      userAgent,
      24 // 24 hours expiration
    );

    // Update last login
    await UserIdentityService.updateLastLogin(userIdentity.custom_id);

    // Create session cookie
    const sessionCookie = SessionManager.createSessionCookie(
      sessionToken,
      24,
      process.env.NODE_ENV === 'production'
    );

    const response = NextResponse.json({
      success: true,
      message: 'Session created successfully',
      user: {
        custom_id: userIdentity.custom_id,
        wallet_address: userIdentity.wallet_address,
        display_name: userIdentity.display_name,
        email: userIdentity.email
      }
    });

    // Set session cookie
    response.headers.set('Set-Cookie', sessionCookie);

    return response;

  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Invalidate session (logout)
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = SessionManager.extractSessionToken(request);
    
    if (sessionToken) {
      await SessionManager.invalidateSession(sessionToken);
    }

    // Create session removal cookie
    const removalCookie = SessionManager.createSessionRemovalCookie();

    const response = NextResponse.json({
      success: true,
      message: 'Session invalidated successfully'
    });

    // Remove session cookie
    response.headers.set('Set-Cookie', removalCookie);

    return response;

  } catch (error) {
    console.error('Session invalidation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Refresh session
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = SessionManager.extractSessionToken(request);
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token provided' },
        { status: 401 }
      );
    }

    const success = await SessionManager.refreshSession(sessionToken, 24);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to refresh session' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session refreshed successfully'
    });

  } catch (error) {
    console.error('Session refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
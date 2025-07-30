import { NextRequest, NextResponse } from 'next/server';

// Define protected routes
const protectedRoutes = ['/dashboard', '/profile', '/delete-wallet', '/sign-document', '/multi-signature', '/verify'];

// Define protected API routes
const protectedApiRoutes = ['/api/steganography'];

// Simple JWT verification for Edge Runtime
function verifyJWTEdge(token: string): { wallet_address: string } | null {
  try {
    // For Edge Runtime, we'll do a simpler token validation
    // Split the JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (middle part)
    const payload = JSON.parse(atob(parts[1]));

    // Check if token has expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // Return the wallet address if present
    if (payload.wallet_address) {
      return { wallet_address: payload.wallet_address };
    }

    return null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Check if the current path is a protected API route
  const isProtectedApiRoute = protectedApiRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute || isProtectedApiRoute) {
    // Get the auth token from cookies
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      if (isProtectedApiRoute) {
        // For API routes, return 401 instead of redirect
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      // No token found, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify the JWT token using Edge-compatible method
    const payload = verifyJWTEdge(token);

    if (!payload) {
      if (isProtectedApiRoute) {
        // For API routes, return 401 instead of redirect
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      // Invalid token, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);

      // Clear the invalid token
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });

      return response;
    }

    // Token is valid, continue to the protected route
    return NextResponse.next();
  }

  // For non-protected routes, continue normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/delete-wallet/:path*',
    '/sign-document/:path*',
    '/multi-signature/:path*',
    '/verify/:path*',
    '/api/steganography/:path*'
  ],
};
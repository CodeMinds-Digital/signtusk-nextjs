import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyJWT } from '@/lib/jwt';

export async function DELETE(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let walletAddress: string;
    try {
      const payload = verifyJWT(token);
      walletAddress = payload.wallet_address;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Delete wallet from database
    const { error: deleteError } = await supabaseAdmin
      .from('wallets')
      .delete()
      .eq('wallet_address', walletAddress);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete wallet' },
        { status: 500 }
      );
    }

    // Clear any pending challenges for this wallet
    await supabaseAdmin
      .from('challenges')
      .delete()
      .eq('wallet_address', walletAddress);

    // Create response and clear auth cookie
    const response = NextResponse.json({
      success: true,
      message: 'Wallet deleted successfully'
    });

    // Clear the auth cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Wallet deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete wallet' },
      { status: 500 }
    );
  }
}
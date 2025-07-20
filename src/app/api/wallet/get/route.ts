import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyJWT } from '@/lib/jwt';

export async function GET(request: NextRequest) {
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
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get wallet data from database
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('wallet_address, encrypted_private_key, created_at')
      .eq('wallet_address', walletAddress)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: {
        wallet_address: wallet.wallet_address,
        encrypted_private_key: wallet.encrypted_private_key,
        created_at: wallet.created_at
      }
    });

  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}
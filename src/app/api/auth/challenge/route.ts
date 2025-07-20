import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address } = await request.json();

    // Validate input
    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Missing required field: wallet_address' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const normalizedAddress = wallet_address.toLowerCase();

    // Check if wallet exists
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('wallet_address')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Generate a secure random nonce
    const nonce = `Signing challenge: ${randomBytes(16).toString('hex')}`;
    
    // Set expiry time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Delete any existing challenges for this wallet
    await supabaseAdmin
      .from('challenges')
      .delete()
      .eq('wallet_address', normalizedAddress);

    // Store the challenge
    const { error: insertError } = await supabaseAdmin
      .from('challenges')
      .insert({
        wallet_address: normalizedAddress,
        nonce,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create challenge' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      nonce,
      expires_at: expiresAt
    });

  } catch (error) {
    console.error('Challenge creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
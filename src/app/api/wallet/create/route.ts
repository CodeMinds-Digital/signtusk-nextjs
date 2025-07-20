import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, encrypted_private_key } = await request.json();

    // Validate input
    if (!wallet_address || !encrypted_private_key) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet_address, encrypted_private_key' },
        { status: 400 }
      );
    }

    // Validate wallet address format (basic Ethereum address validation)
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Check if wallet already exists
    const { data: existingWallet, error: checkError } = await supabaseAdmin
      .from('wallets')
      .select('wallet_address')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database check error:', checkError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (existingWallet) {
      return NextResponse.json(
        { error: 'Wallet address already exists' },
        { status: 409 }
      );
    }

    // Store the wallet
    const { error: insertError } = await supabaseAdmin
      .from('wallets')
      .insert({
        wallet_address: wallet_address.toLowerCase(),
        encrypted_private_key
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create wallet' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet created successfully',
      wallet_address: wallet_address.toLowerCase()
    });

  } catch (error) {
    console.error('Wallet creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'ethers';
import { supabaseAdmin } from '@/lib/supabase';
import { signJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, signature } = await request.json();

    if (!wallet_address || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet_address, signature' },
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

    // Retrieve the pending challenge
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'No pending challenge found' },
        { status: 404 }
      );
    }

    // Check if challenge has expired
    if (new Date() > new Date(challenge.expires_at)) {
      // Clean up expired challenge
      await supabaseAdmin
        .from('challenges')
        .delete()
        .eq('id', challenge.id);

      return NextResponse.json(
        { error: 'Challenge has expired' },
        { status: 401 }
      );
    }

    // Verify the signature
    try {
      const recoveredAddress = verifyMessage(challenge.nonce, signature);

      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } catch (verifyError) {
      console.error('Signature verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Delete the used challenge
    await supabaseAdmin
      .from('challenges')
      .delete()
      .eq('id', challenge.id);

    // Get the custom_id from the wallets table
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('custom_id')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (walletError) {
      console.error('Failed to fetch wallet data:', walletError);
      // Optionally throw or handle error here
    }

    const customId = walletData?.custom_id || null;

    // Generate JWT token with custom_id
    const token = signJWT({
      wallet_address: normalizedAddress,
      custom_id: customId
    });

    // Create response with HttpOnly cookie
    const response = NextResponse.json({
      success: true,
      wallet_address: normalizedAddress,
      custom_id: customId,
      message: 'Authentication successful'
    });

    // Set HttpOnly cookie with JWT
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Authentication verification error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
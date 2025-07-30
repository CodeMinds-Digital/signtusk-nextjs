import { NextRequest, NextResponse } from 'next/server';
import { UserIdentityService } from '@/lib/user-identity';

export async function POST(request: NextRequest) {
  try {
    const {
      wallet_address,
      encrypted_private_key,
      encrypted_mnemonic,
      salt,
      display_name,
      email
    } = await request.json();

    // Validate required input
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

    // Check if wallet already exists (prevents duplicate accounts)
    const existingUser = await UserIdentityService.getUserByWalletAddress(wallet_address);
    if (existingUser) {
      return NextResponse.json(
        {
          error: 'Account already exists with this wallet address',
          message: 'Please use login instead of creating a new account',
          existing_custom_id: existingUser.custom_id
        },
        { status: 409 }
      );
    }

    // Create new user with wallet (generates consistent custom_id)
    const userIdentity = await UserIdentityService.createUserWithWallet(
      wallet_address,
      encrypted_private_key,
      encrypted_mnemonic,
      salt,
      display_name,
      email
    );

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      custom_id: userIdentity.custom_id,
      wallet_address: userIdentity.wallet_address,
      user: {
        custom_id: userIdentity.custom_id,
        wallet_address: userIdentity.wallet_address,
        display_name: userIdentity.display_name,
        email: userIdentity.email
      }
    });

  } catch (error) {
    console.error('Account creation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
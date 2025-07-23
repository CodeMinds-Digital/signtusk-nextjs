import { NextRequest, NextResponse } from 'next/server';
import { UserIdentityService } from '@/lib/user-identity';

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from query parameters or session
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet_address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing wallet_address parameter' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Get existing user by wallet address (NO regeneration)
    const userIdentity = await UserIdentityService.getUserByWalletAddress(walletAddress);
    
    if (!userIdentity) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Account not found',
          message: 'No account exists with this wallet address. Please sign up first.'
        },
        { status: 404 }
      );
    }

    // Update last login timestamp
    await UserIdentityService.updateLastLogin(userIdentity.custom_id);

    return NextResponse.json({
      success: true,
      message: 'Account retrieved successfully',
      wallet: {
        custom_id: userIdentity.custom_id,
        wallet_address: userIdentity.wallet_address,
        encrypted_private_key: userIdentity.encrypted_private_key,
        encrypted_mnemonic: userIdentity.encrypted_mnemonic,
        salt: userIdentity.salt,
        display_name: userIdentity.display_name,
        email: userIdentity.email,
        last_login: userIdentity.last_login
      }
    });

  } catch (error) {
    console.error('Wallet retrieval error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet_address } = await request.json();

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Missing wallet_address' },
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

    // Get existing user by wallet address (NO regeneration)
    const userIdentity = await UserIdentityService.getUserByWalletAddress(wallet_address);
    
    if (!userIdentity) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Account not found',
          message: 'No account exists with this wallet address. Please sign up first.'
        },
        { status: 404 }
      );
    }

    // Update last login timestamp
    await UserIdentityService.updateLastLogin(userIdentity.custom_id);

    return NextResponse.json({
      success: true,
      message: 'Account retrieved successfully',
      wallet: {
        custom_id: userIdentity.custom_id,
        wallet_address: userIdentity.wallet_address,
        encrypted_private_key: userIdentity.encrypted_private_key,
        encrypted_mnemonic: userIdentity.encrypted_mnemonic,
        salt: userIdentity.salt,
        display_name: userIdentity.display_name,
        email: userIdentity.email,
        last_login: userIdentity.last_login
      }
    });

  } catch (error) {
    console.error('Wallet retrieval error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
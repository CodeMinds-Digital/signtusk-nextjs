import { NextRequest, NextResponse } from 'next/server';
import { UserIdentityService } from '@/lib/user-identity';

/**
 * Debug endpoint to test the database function directly
 */
export async function GET() {
  try {
    console.log('Testing database function...');

    const result = await UserIdentityService.testCreateUserFunction();

    return NextResponse.json({
      success: true,
      message: 'Database function test completed',
      result
    });

  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Debug test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Test the function with custom parameters
 */
export async function POST(request: NextRequest) {
  try {
    const { wallet_address, display_name, email } = await request.json();

    const testWalletAddress = wallet_address || `0xtest${Date.now()}`;
    const testDisplayName = display_name || 'Test User';
    const testEmail = email || 'test@example.com';

    console.log('Testing with custom parameters:', {
      testWalletAddress,
      testDisplayName,
      testEmail
    });

    const result = await UserIdentityService.createUserWithWallet(
      testWalletAddress,
      'test_encrypted_key',
      'test_encrypted_mnemonic',
      'test_salt',
      testDisplayName,
      testEmail
    );

    return NextResponse.json({
      success: true,
      message: 'User creation test completed',
      result
    });

  } catch (error) {
    console.error('User creation test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'User creation test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
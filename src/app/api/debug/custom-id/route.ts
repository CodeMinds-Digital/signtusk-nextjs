import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const results: any = {};

    // Test 1: Check if generate_custom_id function exists and works
    console.log('Testing generate_custom_id() function...');
    try {
      const { data: customIdData, error: customIdError } = await supabaseAdmin.rpc('generate_custom_id');
      results.generate_custom_id = {
        success: !customIdError,
        data: customIdData,
        error: customIdError?.message,
        length: customIdData?.length
      };
    } catch (error) {
      results.generate_custom_id = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Check table structure
    console.log('Checking user_profiles table structure...');
    try {
      const { data: tableData, error: tableError } = await supabaseAdmin
        .from('user_profiles')
        .select('custom_id')
        .limit(1);
      
      results.table_access = {
        success: !tableError,
        error: tableError?.message,
        accessible: true
      };
    } catch (error) {
      results.table_access = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Check if create_user_with_wallet function exists
    console.log('Testing create_user_with_wallet() function signature...');
    try {
      // Try with minimal parameters to see if function exists
      const { data: createUserData, error: createUserError } = await supabaseAdmin.rpc('create_user_with_wallet', {
        p_wallet_address: '0x0000000000000000000000000000000000000000',
        p_encrypted_private_key: 'test'
      });
      
      results.create_user_with_wallet = {
        success: !createUserError,
        error: createUserError?.message,
        function_exists: true
      };
    } catch (error) {
      results.create_user_with_wallet = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        function_exists: false
      };
    }

    // Test 4: Check if get_user_by_wallet_address function exists
    console.log('Testing get_user_by_wallet_address() function...');
    try {
      const { data: getUserData, error: getUserError } = await supabaseAdmin.rpc('get_user_by_wallet_address', {
        p_wallet_address: '0x0000000000000000000000000000000000000000'
      });
      
      results.get_user_by_wallet_address = {
        success: !getUserError,
        error: getUserError?.message,
        function_exists: true
      };
    } catch (error) {
      results.get_user_by_wallet_address = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        function_exists: false
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Database function tests completed',
      results
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'test_create_user') {
      // Test creating a user with 18-character custom ID
      const testCustomId = 'TEST' + Date.now().toString().slice(-14); // 18 chars
      const testWalletAddress = '0x' + Date.now().toString(16).padStart(40, '0');

      console.log('Testing user creation with custom ID:', testCustomId);

      const { data, error } = await supabaseAdmin.rpc('create_user_with_wallet', {
        p_wallet_address: testWalletAddress,
        p_encrypted_private_key: 'test_encrypted_key',
        p_encrypted_mnemonic: 'test_mnemonic',
        p_salt: 'test_salt',
        p_display_name: 'Test User',
        p_email: 'test@example.com'
      });

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          testCustomId,
          testWalletAddress
        });
      }

      // Clean up test data
      if (data && data.length > 0) {
        const createdUser = data[0];
        await supabaseAdmin.from('wallets').delete().eq('wallet_address', testWalletAddress);
        await supabaseAdmin.from('user_profiles').delete().eq('custom_id', createdUser.custom_id);
      }

      return NextResponse.json({
        success: true,
        data,
        testCustomId,
        testWalletAddress,
        customIdLength: data?.[0]?.custom_id?.length
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' });

  } catch (error) {
    console.error('Debug POST API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

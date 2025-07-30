// Debug script to test custom ID functionality
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomIdFunctions() {
  console.log('🔍 Testing Custom ID Functions...\n');

  try {
    // Test 1: Check if generate_custom_id function exists and works
    console.log('1. Testing generate_custom_id() function...');
    const { data: customIdData, error: customIdError } = await supabase.rpc('generate_custom_id');
    
    if (customIdError) {
      console.error('❌ generate_custom_id error:', customIdError);
    } else {
      console.log('✅ generate_custom_id result:', customIdData);
      console.log('   Length:', customIdData?.length);
    }

    // Test 2: Check if create_user_with_wallet function exists
    console.log('\n2. Testing create_user_with_wallet() function...');
    const testWalletAddress = '0x1234567890123456789012345678901234567890';
    const testPrivateKey = 'test_encrypted_private_key';
    
    const { data: createUserData, error: createUserError } = await supabase.rpc('create_user_with_wallet', {
      p_wallet_address: testWalletAddress,
      p_encrypted_private_key: testPrivateKey,
      p_encrypted_mnemonic: 'test_mnemonic',
      p_salt: 'test_salt',
      p_display_name: 'Test User',
      p_email: 'test@example.com'
    });

    if (createUserError) {
      console.error('❌ create_user_with_wallet error:', createUserError);
    } else {
      console.log('✅ create_user_with_wallet result:', createUserData);
      
      // Test 3: Try to get the user back
      if (createUserData && createUserData.length > 0) {
        const createdUser = createUserData[0];
        console.log('\n3. Testing get_user_by_wallet_address() function...');
        
        const { data: getUserData, error: getUserError } = await supabase.rpc('get_user_by_wallet_address', {
          p_wallet_address: testWalletAddress
        });

        if (getUserError) {
          console.error('❌ get_user_by_wallet_address error:', getUserError);
        } else {
          console.log('✅ get_user_by_wallet_address result:', getUserData);
          if (getUserData && getUserData.length > 0) {
            console.log('   Custom ID length:', getUserData[0].custom_id?.length);
          }
        }

        // Clean up test data
        console.log('\n4. Cleaning up test data...');
        await supabase.from('wallets').delete().eq('wallet_address', testWalletAddress);
        await supabase.from('user_profiles').delete().eq('custom_id', createdUser.custom_id);
        console.log('✅ Test data cleaned up');
      }
    }

    // Test 4: Check table structure
    console.log('\n5. Checking user_profiles table structure...');
    const { data: tableData, error: tableError } = await supabase
      .from('user_profiles')
      .select('custom_id')
      .limit(1);

    if (tableError) {
      console.error('❌ Table structure error:', tableError);
    } else {
      console.log('✅ user_profiles table accessible');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testCustomIdFunctions().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

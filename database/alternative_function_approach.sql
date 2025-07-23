-- Alternative approach: Use a function that returns a single composite type
-- This avoids the RETURNS TABLE complexity that's causing type mismatches

-- First, create a custom type for the return value
DROP TYPE IF EXISTS user_creation_result CASCADE;
CREATE TYPE user_creation_result AS (
    user_id UUID,
    custom_id VARCHAR(15),
    wallet_address VARCHAR(42)
);

-- Drop the existing problematic function
DROP FUNCTION IF EXISTS create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255));

-- Create a new function that returns the custom type
CREATE OR REPLACE FUNCTION create_user_with_wallet(
    p_wallet_address VARCHAR(42),
    p_encrypted_private_key TEXT,
    p_encrypted_mnemonic TEXT DEFAULT NULL,
    p_salt VARCHAR(64) DEFAULT NULL,
    p_display_name VARCHAR(100) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL
)
RETURNS user_creation_result AS $$
DECLARE
    v_custom_id VARCHAR(15);
    v_user_id UUID;
    v_wallet_id UUID;
    v_wallet_address VARCHAR(42);
    result user_creation_result;
BEGIN
    -- Generate unique custom ID
    v_custom_id := generate_custom_id();
    
    -- Normalize wallet address
    v_wallet_address := LOWER(p_wallet_address);
    
    -- Create user profile
    INSERT INTO user_profiles (custom_id, display_name, email)
    VALUES (v_custom_id, p_display_name, p_email)
    RETURNING id INTO v_user_id;
    
    -- Create wallet linked to user profile
    INSERT INTO wallets (
        user_profile_id, 
        custom_id, 
        wallet_address, 
        encrypted_private_key, 
        encrypted_mnemonic, 
        salt
    )
    VALUES (
        v_user_id, 
        v_custom_id, 
        v_wallet_address, 
        p_encrypted_private_key, 
        p_encrypted_mnemonic, 
        p_salt
    )
    RETURNING id INTO v_wallet_id;
    
    -- Build result
    result.user_id := v_user_id;
    result.custom_id := v_custom_id;
    result.wallet_address := v_wallet_address;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) TO authenticated;

-- Test the function
DO $$
DECLARE
    test_result user_creation_result;
BEGIN
    -- Test the function with sample data
    SELECT * INTO test_result FROM create_user_with_wallet(
        '0xtest' || extract(epoch from now())::text,
        'test_encrypted_key',
        'test_encrypted_mnemonic', 
        'test_salt',
        'Test User',
        'test@example.com'
    );
    
    -- Log the result
    RAISE NOTICE 'Alternative function test successful. User ID: %, Custom ID: %, Wallet: %', 
        test_result.user_id, test_result.custom_id, test_result.wallet_address;
        
    -- Clean up test data
    DELETE FROM wallets WHERE wallet_address = test_result.wallet_address;
    DELETE FROM user_profiles WHERE custom_id = test_result.custom_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Alternative function test failed: %', SQLERRM;
END $$;
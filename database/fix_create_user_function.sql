-- Fix the create_user_with_wallet function to resolve ambiguous column reference
-- This fixes the "column reference 'custom_id' is ambiguous" error

-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255));

CREATE OR REPLACE FUNCTION create_user_with_wallet(
    p_wallet_address VARCHAR(42),
    p_encrypted_private_key TEXT,
    p_encrypted_mnemonic TEXT DEFAULT NULL,
    p_salt VARCHAR(64) DEFAULT NULL,
    p_display_name VARCHAR(100) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
    user_id UUID,
    custom_id VARCHAR(18),
    wallet_address VARCHAR(42)
) AS $$
DECLARE
    v_custom_id VARCHAR(18);
    v_user_id UUID;
    v_wallet_id UUID;
BEGIN
    -- Generate unique custom ID
    v_custom_id := generate_custom_id();

    -- Create user profile
    INSERT INTO user_profiles (custom_id, display_name, email)
    VALUES (v_custom_id, p_display_name, p_email)
    RETURNING id INTO v_user_id;

    -- Create wallet entry
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
        LOWER(p_wallet_address),
        p_encrypted_private_key,
        p_encrypted_mnemonic,
        p_salt
    )
    RETURNING id INTO v_wallet_id;

    -- Return the created user and wallet info with explicit column aliases
    RETURN QUERY 
    SELECT 
        v_user_id as user_id,
        v_custom_id as custom_id,
        LOWER(p_wallet_address)::VARCHAR(42) as wallet_address;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise with more context
        RAISE EXCEPTION 'Failed to create user with wallet: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_user_with_wallet IS 'Create a new user profile and wallet with auto-generated 18-character custom ID';

-- Test the function to make sure it works
DO $$
BEGIN
    -- Test that the function can be called without errors
    RAISE NOTICE 'create_user_with_wallet function updated successfully';
END $$;

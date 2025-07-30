-- Add function to create user with wallet using provided custom ID
-- This function allows the frontend to specify the custom ID instead of generating one

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_user_with_wallet_custom_id(VARCHAR(42), TEXT, VARCHAR(18), TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255));

CREATE OR REPLACE FUNCTION create_user_with_wallet_custom_id(
    p_wallet_address VARCHAR(42),
    p_encrypted_private_key TEXT,
    p_custom_id VARCHAR(18),
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
    v_user_id UUID;
    v_wallet_id UUID;
    v_exists_check INTEGER;
BEGIN
    -- Validate custom ID format (18 alphanumeric characters)
    IF p_custom_id IS NULL OR LENGTH(p_custom_id) != 18 OR p_custom_id !~ '^[A-Z0-9]{18}$' THEN
        RAISE EXCEPTION 'Invalid custom ID: must be exactly 18 alphanumeric characters';
    END IF;

    -- Check if custom ID already exists
    SELECT COUNT(*) INTO v_exists_check 
    FROM user_profiles up
    WHERE up.custom_id = p_custom_id;
    
    IF v_exists_check > 0 THEN
        RAISE EXCEPTION 'Custom ID already exists: %', p_custom_id;
    END IF;

    -- Check if wallet address already exists
    SELECT COUNT(*) INTO v_exists_check 
    FROM wallets w
    WHERE LOWER(w.wallet_address) = LOWER(p_wallet_address);
    
    IF v_exists_check > 0 THEN
        RAISE EXCEPTION 'Wallet address already exists: %', p_wallet_address;
    END IF;

    -- Create user profile with provided custom ID
    INSERT INTO user_profiles (custom_id, display_name, email)
    VALUES (p_custom_id, p_display_name, p_email)
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
        p_custom_id,
        LOWER(p_wallet_address),
        p_encrypted_private_key,
        p_encrypted_mnemonic,
        p_salt
    )
    RETURNING id INTO v_wallet_id;

    -- Return the created user information
    RETURN QUERY
    SELECT 
        v_user_id as user_id,
        p_custom_id as custom_id,
        LOWER(p_wallet_address) as wallet_address;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE EXCEPTION 'Failed to create user with wallet: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_with_wallet_custom_id(VARCHAR(42), TEXT, VARCHAR(18), TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_user_with_wallet_custom_id IS 'Create a new user profile and wallet with a provided custom ID (18 characters)';

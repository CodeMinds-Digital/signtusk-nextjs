-- Fix for ambiguous custom_id error in create_user_with_wallet function

-- Drop and recreate the function with proper variable naming to avoid ambiguity
DROP FUNCTION IF EXISTS create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255));

-- Function to create user profile with wallet (Sign-up) - FIXED VERSION
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
    custom_id VARCHAR(15),
    wallet_address VARCHAR(42)
) AS $$
DECLARE
    v_custom_id VARCHAR(15);
    v_user_id UUID;
    v_wallet_id UUID;
BEGIN
    -- Generate unique custom ID
    v_custom_id := generate_custom_id();
    
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
        LOWER(p_wallet_address), 
        p_encrypted_private_key, 
        p_encrypted_mnemonic, 
        p_salt
    )
    RETURNING id INTO v_wallet_id;
    
    -- Return the created user and wallet info using explicit column names
    RETURN QUERY SELECT v_user_id as user_id, v_custom_id as custom_id, LOWER(p_wallet_address) as wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Also fix the generate_custom_id function to avoid similar issues
DROP FUNCTION IF EXISTS generate_custom_id();

CREATE OR REPLACE FUNCTION generate_custom_id()
RETURNS VARCHAR(15) AS $$
DECLARE
    letters CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    numbers CONSTANT TEXT := '0123456789';
    v_custom_id VARCHAR(15);
    v_exists_check INTEGER;
BEGIN
    LOOP
        -- Generate custom ID: 3 letters + 4 numbers + 4 letters + 4 numbers
        v_custom_id := '';
        
        -- First 3 letters
        FOR i IN 1..3 LOOP
            v_custom_id := v_custom_id || substr(letters, floor(random() * length(letters) + 1)::int, 1);
        END LOOP;
        
        -- 4 numbers
        FOR i IN 1..4 LOOP
            v_custom_id := v_custom_id || substr(numbers, floor(random() * length(numbers) + 1)::int, 1);
        END LOOP;
        
        -- 4 letters
        FOR i IN 1..4 LOOP
            v_custom_id := v_custom_id || substr(letters, floor(random() * length(letters) + 1)::int, 1);
        END LOOP;
        
        -- 4 numbers
        FOR i IN 1..4 LOOP
            v_custom_id := v_custom_id || substr(numbers, floor(random() * length(numbers) + 1)::int, 1);
        END LOOP;
        
        -- Check if this custom_id already exists (using table alias to avoid ambiguity)
        SELECT COUNT(*) INTO v_exists_check 
        FROM user_profiles up
        WHERE up.custom_id = v_custom_id;
        
        -- If unique, break the loop
        IF v_exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN v_custom_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the fixed functions
GRANT EXECUTE ON FUNCTION generate_custom_id() TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) TO authenticated;
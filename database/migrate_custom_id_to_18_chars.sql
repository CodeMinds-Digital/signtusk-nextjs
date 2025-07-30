-- Migration script to update custom_id from 15 to 18 characters
-- New format: 18 random alphanumeric characters (e.g., XZ9A93BF12DE3QWA1E)
-- Run this script to update the database schema

-- Update user_profiles table
ALTER TABLE user_profiles ALTER COLUMN custom_id TYPE VARCHAR(19);

-- Update wallets table
ALTER TABLE wallets ALTER COLUMN custom_id TYPE VARCHAR(19);

-- Update auth_sessions table
ALTER TABLE auth_sessions ALTER COLUMN custom_id TYPE VARCHAR(19);

-- Update documents table
ALTER TABLE documents ALTER COLUMN uploader_custom_id TYPE VARCHAR(19);

-- Update document_signatures table
ALTER TABLE document_signatures ALTER COLUMN signer_custom_id TYPE VARCHAR(19);

-- Update audit_logs table
ALTER TABLE audit_logs ALTER COLUMN user_custom_id TYPE VARCHAR(19);

-- Update multi_signature_requests table
ALTER TABLE multi_signature_requests ALTER COLUMN initiator_custom_id TYPE VARCHAR(19);

-- Update required_signers table
ALTER TABLE required_signers ALTER COLUMN signer_custom_id TYPE VARCHAR(19);

-- Update verification_attempts table
ALTER TABLE verification_attempts ALTER COLUMN verifier_custom_id TYPE VARCHAR(19);

-- Update the generate_custom_id function to generate 18 random alphanumeric characters
CREATE OR REPLACE FUNCTION generate_custom_id()
RETURNS VARCHAR(18) AS $$
DECLARE
    chars CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    custom_id VARCHAR(18);
    exists_check INTEGER;
BEGIN
    LOOP
        -- Generate custom ID: 18 random alphanumeric characters
        custom_id := '';

        -- Generate 18 random characters
        FOR i IN 1..18 LOOP
            custom_id := custom_id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;

        -- Check if this custom_id already exists
        SELECT COUNT(*) INTO exists_check
        FROM user_profiles
        WHERE custom_id = custom_id;

        -- If it doesn't exist, we can use it
        EXIT WHEN exists_check = 0;
    END LOOP;

    RETURN custom_id;
END;
$$ LANGUAGE plpgsql;

-- Update the create_user_with_wallet function return type
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
    
    -- Return the created user and wallet info
    RETURN QUERY SELECT v_user_id, v_custom_id, LOWER(p_wallet_address)::VARCHAR(42);
END;
$$ LANGUAGE plpgsql;

-- Update get_user_by_wallet_address function return type
CREATE OR REPLACE FUNCTION get_user_by_wallet_address(p_wallet_address VARCHAR(42))
RETURNS TABLE(
    user_id UUID,
    custom_id VARCHAR(18),
    wallet_address VARCHAR(42),
    encrypted_private_key TEXT,
    encrypted_mnemonic TEXT,
    salt VARCHAR(64),
    display_name VARCHAR(100),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.custom_id,
        w.wallet_address,
        w.encrypted_private_key,
        w.encrypted_mnemonic,
        w.salt,
        up.display_name,
        up.email,
        up.created_at,
        up.last_login
    FROM user_profiles up
    JOIN wallets w ON up.id = w.user_profile_id
    WHERE w.wallet_address = LOWER(p_wallet_address)
    AND up.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Update update_last_login function parameter type
CREATE OR REPLACE FUNCTION update_last_login(p_custom_id VARCHAR(18))
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles 
    SET last_login = NOW() 
    WHERE custom_id = p_custom_id;
END;
$$ LANGUAGE plpgsql;

-- Update get_user_document_summary function parameter type
CREATE OR REPLACE FUNCTION get_user_document_summary(p_custom_id VARCHAR(18))
RETURNS TABLE(
    total_documents BIGINT,
    signed_documents BIGINT,
    pending_documents BIGINT,
    rejected_documents BIGINT,
    recent_activity JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE d.status = 'signed') as signed_documents,
        COUNT(*) FILTER (WHERE d.status IN ('uploaded', 'previewed')) as pending_documents,
        COUNT(*) FILTER (WHERE d.status = 'rejected') as rejected_documents,
        jsonb_agg(
            jsonb_build_object(
                'document_id', d.id,
                'filename', d.filename,
                'status', d.status,
                'created_at', d.created_at
            ) ORDER BY d.created_at DESC
        ) FILTER (WHERE d.id IS NOT NULL) as recent_activity
    FROM documents d
    WHERE d.uploader_custom_id = p_custom_id;
END;
$$ LANGUAGE plpgsql;

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.1.0', 'Updated custom_id from 15 to 18 characters');

-- Add comment
COMMENT ON COLUMN user_profiles.custom_id IS 'Unique 18-character alphanumeric identifier (uppercase letters and numbers)';

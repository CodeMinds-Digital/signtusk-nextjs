-- Fix for ambiguous column reference error
-- This script fixes the "column reference 'custom_id' is ambiguous" error
-- Run this script to resolve the issue

-- ============================================================================
-- STEP 1: Drop problematic steganography functions if they exist
-- ============================================================================

DROP FUNCTION IF EXISTS log_steganographic_access(UUID, VARCHAR(18), VARCHAR(50), INET, TEXT, BOOLEAN, TEXT, JSONB);
DROP FUNCTION IF EXISTS get_user_steganographic_images(VARCHAR(18));
DROP FUNCTION IF EXISTS update_steganographic_download_stats(UUID);
DROP FUNCTION IF EXISTS cleanup_expired_steganographic_images();
DROP FUNCTION IF EXISTS get_steganographic_stats();

-- ============================================================================
-- STEP 2: Recreate the create_user_with_wallet function to ensure it's correct
-- ============================================================================

-- Drop and recreate the user creation function
DROP FUNCTION IF EXISTS create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255));

-- Recreate the function with explicit table qualifications
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
    v_wallet_address VARCHAR(42);
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
    
    -- Return result
    RETURN QUERY SELECT v_user_id, v_custom_id, v_wallet_address;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Recreate steganography functions with proper table qualifications
-- ============================================================================

-- Function to get user's steganographic images
CREATE OR REPLACE FUNCTION get_user_steganographic_images(p_custom_id VARCHAR(18))
RETURNS TABLE(
    id UUID,
    image_name VARCHAR(255),
    data_type VARCHAR(50),
    file_size BIGINT,
    image_format VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    public_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.id,
        si.image_name,
        si.data_type,
        si.file_size,
        si.image_format,
        si.created_at,
        si.download_count,
        si.last_downloaded_at,
        si.public_url
    FROM steganographic_images si
    WHERE si.custom_id = p_custom_id 
    AND si.is_active = true
    ORDER BY si.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to log steganographic access with explicit table qualifications
CREATE OR REPLACE FUNCTION log_steganographic_access(
    p_image_id UUID,
    p_user_custom_id VARCHAR(18),
    p_access_type VARCHAR(50),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO steganographic_access_logs (
        steganographic_image_id,
        user_custom_id,
        user_wallet_address,
        access_type,
        ip_address,
        user_agent,
        success,
        error_message,
        additional_data
    )
    SELECT 
        p_image_id,
        p_user_custom_id,
        w.wallet_address,
        p_access_type,
        p_ip_address,
        p_user_agent,
        p_success,
        p_error_message,
        p_additional_data
    FROM user_profiles up
    INNER JOIN wallets w ON up.id = w.user_profile_id
    WHERE up.custom_id = p_user_custom_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update download statistics
CREATE OR REPLACE FUNCTION update_steganographic_download_stats(p_image_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE steganographic_images 
    SET 
        download_count = download_count + 1,
        last_downloaded_at = NOW()
    WHERE id = p_image_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired steganographic images
CREATE OR REPLACE FUNCTION cleanup_expired_steganographic_images()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE steganographic_images 
    SET is_active = false
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_active = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get steganographic statistics
CREATE OR REPLACE FUNCTION get_steganographic_stats()
RETURNS TABLE(
    total_images BIGINT,
    active_images BIGINT,
    total_downloads BIGINT,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM steganographic_images) as total_images,
        (SELECT COUNT(*) FROM steganographic_images WHERE is_active = true) as active_images,
        (SELECT COALESCE(SUM(download_count), 0) FROM steganographic_images) as total_downloads,
        (SELECT COUNT(DISTINCT si.custom_id) FROM steganographic_images si WHERE si.is_active = true) as unique_users;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Grant permissions
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_steganographic_images(VARCHAR(18)) TO authenticated;
GRANT EXECUTE ON FUNCTION log_steganographic_access(UUID, VARCHAR(18), VARCHAR(50), INET, TEXT, BOOLEAN, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_steganographic_download_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_steganographic_images() TO authenticated;
GRANT EXECUTE ON FUNCTION get_steganographic_stats() TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the create_user_with_wallet function
DO $$
DECLARE
    test_result RECORD;
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
    
    RAISE NOTICE 'Test successful - User ID: %, Custom ID: %, Wallet: %', 
        test_result.user_id, test_result.custom_id, test_result.wallet_address;
        
    -- Clean up test data
    DELETE FROM wallets WHERE wallet_address = test_result.wallet_address;
    DELETE FROM user_profiles WHERE custom_id = test_result.custom_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test failed: %', SQLERRM;
END;
$$;

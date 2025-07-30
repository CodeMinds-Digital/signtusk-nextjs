-- Steganography Schema Extension for SignTusk
-- Adds support for steganographic data storage and management
-- To be applied after complete_schema_fixed.sql

-- ============================================================================
-- STEGANOGRAPHY TABLES
-- ============================================================================

-- Steganographic images table to store metadata about hidden data
CREATE TABLE steganographic_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL REFERENCES wallets(wallet_address) ON DELETE CASCADE,
    image_name VARCHAR(255) NOT NULL,
    original_carrier_name VARCHAR(255), -- Name of original carrier image if user-provided
    supabase_path VARCHAR(500) NOT NULL,
    public_url TEXT,
    stego_key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of stego key for verification
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('wallet_backup', 'private_key', 'mnemonic', 'custom_data')),
    encryption_version VARCHAR(20) DEFAULT 'v2',
    file_size BIGINT NOT NULL,
    image_format VARCHAR(10) NOT NULL CHECK (image_format IN ('PNG', 'JPEG', 'JPG')),
    metadata JSONB, -- Additional metadata about the steganographic process
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration date
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE
);

-- Steganographic access logs for comprehensive audit trail
CREATE TABLE steganographic_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    steganographic_image_id UUID REFERENCES steganographic_images(id) ON DELETE CASCADE,
    user_custom_id VARCHAR(18) REFERENCES user_profiles(custom_id),
    user_wallet_address VARCHAR(42) REFERENCES wallets(wallet_address),
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('create', 'download', 'view', 'delete', 'verify')),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    additional_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Steganographic images indexes
CREATE INDEX idx_steganographic_images_user_profile_id ON steganographic_images(user_profile_id);
CREATE INDEX idx_steganographic_images_custom_id ON steganographic_images(custom_id);
CREATE INDEX idx_steganographic_images_wallet_address ON steganographic_images(wallet_address);
CREATE INDEX idx_steganographic_images_data_type ON steganographic_images(data_type);
CREATE INDEX idx_steganographic_images_is_active ON steganographic_images(is_active);
CREATE INDEX idx_steganographic_images_created_at ON steganographic_images(created_at);
CREATE INDEX idx_steganographic_images_expires_at ON steganographic_images(expires_at);

-- Access logs indexes
CREATE INDEX idx_steganographic_access_logs_image_id ON steganographic_access_logs(steganographic_image_id);
CREATE INDEX idx_steganographic_access_logs_user_custom_id ON steganographic_access_logs(user_custom_id);
CREATE INDEX idx_steganographic_access_logs_access_type ON steganographic_access_logs(access_type);
CREATE INDEX idx_steganographic_access_logs_timestamp ON steganographic_access_logs(timestamp);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger for steganographic_images
CREATE TRIGGER update_steganographic_images_updated_at 
    BEFORE UPDATE ON steganographic_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CUSTOM FUNCTIONS
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

-- Function to log steganographic access
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
        (SELECT COUNT(DISTINCT custom_id) FROM steganographic_images WHERE is_active = true) as unique_users;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on steganography tables
ALTER TABLE steganographic_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE steganographic_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for steganographic_images
CREATE POLICY "Users can view their own steganographic images" ON steganographic_images
    FOR SELECT USING (true); -- Adjust based on session management

CREATE POLICY "Users can insert their own steganographic images" ON steganographic_images
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own steganographic images" ON steganographic_images
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own steganographic images" ON steganographic_images
    FOR DELETE USING (true);

-- RLS Policies for steganographic_access_logs
CREATE POLICY "Users can view steganographic access logs" ON steganographic_access_logs
    FOR SELECT USING (true);

CREATE POLICY "Users can insert steganographic access logs" ON steganographic_access_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON steganographic_images TO authenticated;
GRANT ALL ON steganographic_access_logs TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_steganographic_images(VARCHAR(18)) TO authenticated;
GRANT EXECUTE ON FUNCTION log_steganographic_access(UUID, VARCHAR(18), VARCHAR(50), INET, TEXT, BOOLEAN, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_steganographic_download_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_steganographic_images() TO authenticated;
GRANT EXECUTE ON FUNCTION get_steganographic_stats() TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE steganographic_images IS 'Stores metadata about steganographic images containing hidden encrypted data';
COMMENT ON TABLE steganographic_access_logs IS 'Audit trail for all steganographic operations';

COMMENT ON FUNCTION get_user_steganographic_images(VARCHAR(18)) IS 'Returns all active steganographic images for a user';
COMMENT ON FUNCTION log_steganographic_access(UUID, VARCHAR(18), VARCHAR(50), INET, TEXT, BOOLEAN, TEXT, JSONB) IS 'Logs steganographic access attempts';
COMMENT ON FUNCTION update_steganographic_download_stats(UUID) IS 'Updates download statistics for steganographic images';
COMMENT ON FUNCTION cleanup_expired_steganographic_images() IS 'Marks expired steganographic images as inactive';
COMMENT ON FUNCTION get_steganographic_stats() IS 'Returns overall steganographic usage statistics';

-- Update schema version
INSERT INTO schema_version (version, description) 
VALUES ('1.2.0', 'Added steganography support with secure image-based data hiding');

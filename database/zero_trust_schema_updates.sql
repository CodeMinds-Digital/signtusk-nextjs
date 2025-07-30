-- Zero Trust Security Database Schema Updates
-- Adds support for enhanced encryption, steganography, and security auditing
-- Compatible with existing complete_schema_fixed.sql

-- ============================================================================
-- MODIFY EXISTING TABLES FOR ZERO TRUST SUPPORT
-- ============================================================================

-- Add Zero Trust security fields to wallets table
ALTER TABLE wallets 
ADD COLUMN encryption_version VARCHAR(20) DEFAULT 'v1',
ADD COLUMN enhanced_encryption_data JSONB,
ADD COLUMN steganography_enabled BOOLEAN DEFAULT false,
ADD COLUMN steganography_metadata JSONB,
ADD COLUMN security_level VARCHAR(20) DEFAULT 'standard' CHECK (security_level IN ('standard', 'enhanced', 'maximum'));

-- Add security context to auth_sessions table
ALTER TABLE auth_sessions
ADD COLUMN security_level VARCHAR(20) DEFAULT 'standard',
ADD COLUMN encryption_version_used VARCHAR(20) DEFAULT 'v1',
ADD COLUMN device_fingerprint VARCHAR(255),
ADD COLUMN security_context JSONB;

-- ============================================================================
-- NEW TABLES FOR ZERO TRUST SECURITY
-- ============================================================================

-- Security events audit table for Zero Trust monitoring
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(15) REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) REFERENCES wallets(wallet_address) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'SECURITY_UPGRADE', 'SECURITY_DOWNGRADE', 'ENCRYPTION_CHANGE', 
        'STEGANOGRAPHY_ENABLED', 'STEGANOGRAPHY_DISABLED', 'SUSPICIOUS_ACTIVITY',
        'DEVICE_CHANGE', 'SECURITY_AUDIT', 'FALLBACK_USED'
    )),
    old_security_level VARCHAR(20),
    new_security_level VARCHAR(20),
    old_encryption_version VARCHAR(20),
    new_encryption_version VARCHAR(20),
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device security context table for continuous verification
CREATE TABLE device_security_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(15) REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    browser_info JSONB,
    security_capabilities JSONB,
    trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_trusted BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    verification_count INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0
);

-- Security metrics table for Zero Trust analytics
CREATE TABLE security_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE DEFAULT CURRENT_DATE,
    total_users INTEGER DEFAULT 0,
    standard_security_users INTEGER DEFAULT 0,
    enhanced_security_users INTEGER DEFAULT 0,
    maximum_security_users INTEGER DEFAULT 0,
    steganography_users INTEGER DEFAULT 0,
    security_upgrades INTEGER DEFAULT 0,
    security_downgrades INTEGER DEFAULT 0,
    suspicious_events INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_date)
);

-- ============================================================================
-- INDEXES FOR ZERO TRUST PERFORMANCE
-- ============================================================================

-- Wallets table indexes for Zero Trust
CREATE INDEX idx_wallets_encryption_version ON wallets(encryption_version);
CREATE INDEX idx_wallets_security_level ON wallets(security_level);
CREATE INDEX idx_wallets_steganography_enabled ON wallets(steganography_enabled);

-- Auth sessions indexes for security context
CREATE INDEX idx_auth_sessions_security_level ON auth_sessions(security_level);
CREATE INDEX idx_auth_sessions_encryption_version ON auth_sessions(encryption_version_used);
CREATE INDEX idx_auth_sessions_device_fingerprint ON auth_sessions(device_fingerprint);

-- Security events indexes
CREATE INDEX idx_security_events_custom_id ON security_events(custom_id);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_risk_score ON security_events(risk_score);

-- Device security context indexes
CREATE INDEX idx_device_security_custom_id ON device_security_context(custom_id);
CREATE INDEX idx_device_security_fingerprint ON device_security_context(device_fingerprint);
CREATE INDEX idx_device_security_trust_score ON device_security_context(trust_score);
CREATE INDEX idx_device_security_is_trusted ON device_security_context(is_trusted);

-- Security metrics indexes
CREATE INDEX idx_security_metrics_date ON security_metrics(metric_date);

-- ============================================================================
-- ZERO TRUST FUNCTIONS
-- ============================================================================

-- Function to upgrade wallet security level
CREATE OR REPLACE FUNCTION upgrade_wallet_security(
    p_wallet_address VARCHAR(42),
    p_new_security_level VARCHAR(20),
    p_new_encryption_version VARCHAR(20),
    p_enhanced_encryption_data JSONB DEFAULT NULL,
    p_steganography_enabled BOOLEAN DEFAULT false,
    p_steganography_metadata JSONB DEFAULT NULL,
    p_device_fingerprint VARCHAR(255) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_security_level VARCHAR(20);
    v_old_encryption_version VARCHAR(20);
    v_custom_id VARCHAR(15);
    v_user_profile_id UUID;
BEGIN
    -- Get current security level and user info
    SELECT security_level, encryption_version, custom_id, user_profile_id
    INTO v_old_security_level, v_old_encryption_version, v_custom_id, v_user_profile_id
    FROM wallets 
    WHERE wallet_address = LOWER(p_wallet_address);
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update wallet security
    UPDATE wallets 
    SET 
        security_level = p_new_security_level,
        encryption_version = p_new_encryption_version,
        enhanced_encryption_data = p_enhanced_encryption_data,
        steganography_enabled = p_steganography_enabled,
        steganography_metadata = p_steganography_metadata,
        updated_at = NOW()
    WHERE wallet_address = LOWER(p_wallet_address);
    
    -- Log security event
    INSERT INTO security_events (
        user_profile_id, custom_id, wallet_address, event_type,
        old_security_level, new_security_level,
        old_encryption_version, new_encryption_version,
        event_details, ip_address, user_agent, device_fingerprint
    ) VALUES (
        v_user_profile_id, v_custom_id, LOWER(p_wallet_address), 'SECURITY_UPGRADE',
        v_old_security_level, p_new_security_level,
        v_old_encryption_version, p_new_encryption_version,
        jsonb_build_object(
            'steganography_enabled', p_steganography_enabled,
            'upgrade_timestamp', NOW()
        ),
        p_ip_address, p_user_agent, p_device_fingerprint
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to update device security context
CREATE OR REPLACE FUNCTION update_device_security_context(
    p_custom_id VARCHAR(15),
    p_device_fingerprint VARCHAR(255),
    p_device_name VARCHAR(100) DEFAULT NULL,
    p_browser_info JSONB DEFAULT NULL,
    p_security_capabilities JSONB DEFAULT NULL,
    p_verification_success BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    v_context_id UUID;
    v_user_profile_id UUID;
    v_trust_score INTEGER;
    v_verification_count INTEGER;
    v_failed_attempts INTEGER;
BEGIN
    -- Get user profile ID
    SELECT id INTO v_user_profile_id
    FROM user_profiles
    WHERE custom_id = p_custom_id;

    -- Check if device context exists
    SELECT id, trust_score, verification_count, failed_attempts
    INTO v_context_id, v_trust_score, v_verification_count, v_failed_attempts
    FROM device_security_context
    WHERE custom_id = p_custom_id AND device_fingerprint = p_device_fingerprint;

    IF FOUND THEN
        -- Update existing context
        IF p_verification_success THEN
            v_trust_score := LEAST(100, v_trust_score + 5);
            v_verification_count := v_verification_count + 1;
        ELSE
            v_trust_score := GREATEST(0, v_trust_score - 10);
            v_failed_attempts := v_failed_attempts + 1;
        END IF;

        UPDATE device_security_context
        SET
            device_name = COALESCE(p_device_name, device_name),
            browser_info = COALESCE(p_browser_info, browser_info),
            security_capabilities = COALESCE(p_security_capabilities, security_capabilities),
            trust_score = v_trust_score,
            last_seen = NOW(),
            verification_count = v_verification_count,
            failed_attempts = v_failed_attempts,
            is_trusted = (v_trust_score >= 80 AND v_failed_attempts < 3)
        WHERE id = v_context_id;
    ELSE
        -- Create new context
        v_trust_score := CASE WHEN p_verification_success THEN 60 ELSE 20 END;
        v_verification_count := CASE WHEN p_verification_success THEN 1 ELSE 0 END;
        v_failed_attempts := CASE WHEN p_verification_success THEN 0 ELSE 1 END;

        INSERT INTO device_security_context (
            user_profile_id, custom_id, device_fingerprint, device_name,
            browser_info, security_capabilities, trust_score,
            verification_count, failed_attempts, is_trusted
        ) VALUES (
            v_user_profile_id, p_custom_id, p_device_fingerprint, p_device_name,
            p_browser_info, p_security_capabilities, v_trust_score,
            v_verification_count, v_failed_attempts, (v_trust_score >= 80)
        ) RETURNING id INTO v_context_id;
    END IF;

    RETURN v_context_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get security statistics
CREATE OR REPLACE FUNCTION get_security_statistics()
RETURNS TABLE(
    total_users BIGINT,
    standard_users BIGINT,
    enhanced_users BIGINT,
    maximum_users BIGINT,
    steganography_users BIGINT,
    trusted_devices BIGINT,
    high_risk_events BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM user_profiles WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM wallets WHERE security_level = 'standard') as standard_users,
        (SELECT COUNT(*) FROM wallets WHERE security_level = 'enhanced') as enhanced_users,
        (SELECT COUNT(*) FROM wallets WHERE security_level = 'maximum') as maximum_users,
        (SELECT COUNT(*) FROM wallets WHERE steganography_enabled = true) as steganography_users,
        (SELECT COUNT(*) FROM device_security_context WHERE is_trusted = true) as trusted_devices,
        (SELECT COUNT(*) FROM security_events WHERE risk_score >= 70 AND created_at >= NOW() - INTERVAL '24 hours') as high_risk_events;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old security data
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS VOID AS $$
BEGIN
    -- Clean old security events (older than 2 years)
    DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '2 years';

    -- Clean inactive device contexts (not seen for 6 months)
    DELETE FROM device_security_context WHERE last_seen < NOW() - INTERVAL '6 months';

    -- Reset failed attempts for devices not seen recently
    UPDATE device_security_context
    SET failed_attempts = 0
    WHERE last_seen < NOW() - INTERVAL '30 days' AND failed_attempts > 0;

    -- Log cleanup
    INSERT INTO security_events (event_type, event_details)
    VALUES ('SECURITY_AUDIT', jsonb_build_object('action', 'cleanup_security_data', 'timestamp', NOW()));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR ZERO TRUST
-- ============================================================================

-- Trigger to update security metrics when wallets change
CREATE OR REPLACE FUNCTION update_security_metrics_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert daily metrics
    INSERT INTO security_metrics (
        metric_date,
        total_users,
        standard_security_users,
        enhanced_security_users,
        maximum_security_users,
        steganography_users
    )
    SELECT
        CURRENT_DATE,
        (SELECT COUNT(*) FROM user_profiles WHERE is_active = true),
        (SELECT COUNT(*) FROM wallets WHERE security_level = 'standard'),
        (SELECT COUNT(*) FROM wallets WHERE security_level = 'enhanced'),
        (SELECT COUNT(*) FROM wallets WHERE security_level = 'maximum'),
        (SELECT COUNT(*) FROM wallets WHERE steganography_enabled = true)
    ON CONFLICT (metric_date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        standard_security_users = EXCLUDED.standard_security_users,
        enhanced_security_users = EXCLUDED.enhanced_security_users,
        maximum_security_users = EXCLUDED.maximum_security_users,
        steganography_users = EXCLUDED.steganography_users;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on wallets table
CREATE TRIGGER update_security_metrics_on_wallet_change
    AFTER INSERT OR UPDATE OR DELETE ON wallets
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_security_metrics_trigger();

-- ============================================================================
-- ROW LEVEL SECURITY FOR ZERO TRUST TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_security_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_events
CREATE POLICY "Users can view their own security events" ON security_events
    FOR SELECT USING (true); -- Adjust based on session management

CREATE POLICY "Users can insert their own security events" ON security_events
    FOR INSERT WITH CHECK (true);

-- RLS Policies for device_security_context
CREATE POLICY "Users can view their own device context" ON device_security_context
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own device context" ON device_security_context
    FOR ALL USING (true);

-- RLS Policies for security_metrics (read-only for users)
CREATE POLICY "Users can view security metrics" ON security_metrics
    FOR SELECT USING (true);

-- ============================================================================
-- PERMISSIONS FOR ZERO TRUST
-- ============================================================================

-- Grant permissions on new tables
GRANT ALL ON security_events TO authenticated;
GRANT ALL ON device_security_context TO authenticated;
GRANT SELECT ON security_metrics TO authenticated;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION upgrade_wallet_security(VARCHAR(42), VARCHAR(20), VARCHAR(20), JSONB, BOOLEAN, JSONB, VARCHAR(255), INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(VARCHAR(15), VARCHAR(50), JSONB, INTEGER, INET, TEXT, VARCHAR(255)) TO authenticated;
GRANT EXECUTE ON FUNCTION update_device_security_context(VARCHAR(15), VARCHAR(255), VARCHAR(100), JSONB, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_security_data() TO authenticated;

-- ============================================================================
-- COMMENTS FOR ZERO TRUST DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN wallets.encryption_version IS 'Version of encryption used: v1=legacy, v2=enhanced, v3=combined';
COMMENT ON COLUMN wallets.enhanced_encryption_data IS 'JSON storage for EncryptionResult objects in enhanced/combined modes';
COMMENT ON COLUMN wallets.steganography_enabled IS 'Whether steganography is enabled for this wallet';
COMMENT ON COLUMN wallets.steganography_metadata IS 'Metadata about steganography usage (non-sensitive)';
COMMENT ON COLUMN wallets.security_level IS 'Security level: standard, enhanced, or maximum';

COMMENT ON TABLE security_events IS 'Audit trail for Zero Trust security events';
COMMENT ON TABLE device_security_context IS 'Device trust and security context for continuous verification';
COMMENT ON TABLE security_metrics IS 'Daily aggregated security metrics for analytics';

COMMENT ON FUNCTION upgrade_wallet_security(VARCHAR(42), VARCHAR(20), VARCHAR(20), JSONB, BOOLEAN, JSONB, VARCHAR(255), INET, TEXT) IS 'Upgrades wallet security level with audit logging';
COMMENT ON FUNCTION log_security_event(VARCHAR(15), VARCHAR(50), JSONB, INTEGER, INET, TEXT, VARCHAR(255)) IS 'Logs security events for Zero Trust monitoring';
COMMENT ON FUNCTION update_device_security_context(VARCHAR(15), VARCHAR(255), VARCHAR(100), JSONB, JSONB, BOOLEAN) IS 'Updates device trust score and security context';
COMMENT ON FUNCTION get_security_statistics() IS 'Returns current Zero Trust security statistics';
COMMENT ON FUNCTION cleanup_security_data() IS 'Cleans up old security data and resets counters';

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.2.0', 'Zero Trust security implementation with enhanced encryption, steganography support, and security auditing');

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_custom_id VARCHAR(15),
    p_event_type VARCHAR(50),
    p_event_details JSONB DEFAULT NULL,
    p_risk_score INTEGER DEFAULT 0,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_fingerprint VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_user_profile_id UUID;
    v_wallet_address VARCHAR(42);
BEGIN
    -- Get user info
    SELECT up.id, w.wallet_address
    INTO v_user_profile_id, v_wallet_address
    FROM user_profiles up
    LEFT JOIN wallets w ON up.id = w.user_profile_id
    WHERE up.custom_id = p_custom_id;
    
    -- Insert security event
    INSERT INTO security_events (
        user_profile_id, custom_id, wallet_address, event_type,
        event_details, risk_score, ip_address, user_agent, device_fingerprint
    ) VALUES (
        v_user_profile_id, p_custom_id, v_wallet_address, p_event_type,
        p_event_details, p_risk_score, p_ip_address, p_user_agent, p_device_fingerprint
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Complete SignTusk Database Schema with Zero Trust Security
-- Combines: complete_schema_fixed.sql + migrate_custom_id_to_18_chars.sql + zero_trust_schema_updates.sql
-- Version: 2.0.0 - Complete schema with 18-character Custom IDs and Zero Trust security
-- 
-- This is the definitive schema file that includes:
-- - User Identity Management
-- - Document Signing System  
-- - 18-character Custom ID support
-- - Zero Trust Security features
-- - Enhanced encryption and steganography support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USER IDENTITY MANAGEMENT TABLES (Updated for 18-char Custom IDs)
-- ============================================================================

-- User profiles table with 18-character custom IDs
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id VARCHAR(18) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Wallets table with Zero Trust security support
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    encrypted_mnemonic TEXT,
    salt VARCHAR(64),
    -- Zero Trust Security Fields
    encryption_version VARCHAR(20) DEFAULT 'v1',
    enhanced_encryption_data JSONB,
    steganography_enabled BOOLEAN DEFAULT false,
    steganography_metadata JSONB,
    security_level VARCHAR(20) DEFAULT 'standard' CHECK (security_level IN ('standard', 'enhanced', 'maximum')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_primary BOOLEAN DEFAULT true
);

-- Authentication challenges table
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES wallets(wallet_address) ON DELETE CASCADE,
    nonce VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT false
);

-- Authentication sessions table with Zero Trust context
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL REFERENCES wallets(wallet_address) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    -- Zero Trust Security Context
    security_level VARCHAR(20) DEFAULT 'standard',
    encryption_version_used VARCHAR(20) DEFAULT 'v1',
    device_fingerprint VARCHAR(255),
    security_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- DOCUMENT SIGNING SYSTEM TABLES (Updated for 18-char Custom IDs)
-- ============================================================================

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'previewed', 'signed', 'rejected')),
    signature_type VARCHAR(20) DEFAULT 'single' CHECK (signature_type IN ('single', 'multi')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document signatures table
CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    signature_data TEXT NOT NULL,
    signature_hash VARCHAR(64) NOT NULL,
    signature_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    signature_method VARCHAR(50) DEFAULT 'ethereum_personal_sign',
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    gas_used BIGINT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-signature requests table
CREATE TABLE multi_signature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    initiator_custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    required_signatures INTEGER NOT NULL DEFAULT 1,
    current_signatures INTEGER DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Required signers for multi-signature documents
CREATE TABLE required_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    multi_signature_request_id UUID NOT NULL REFERENCES multi_signature_requests(id) ON DELETE CASCADE,
    signer_custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    signer_role VARCHAR(50) DEFAULT 'signer',
    signing_order INTEGER,
    has_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_id UUID REFERENCES document_signatures(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ZERO TRUST SECURITY TABLES
-- ============================================================================

-- Security events audit table for Zero Trust monitoring
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(18) REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
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

-- Security configurations table
CREATE TABLE security_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device trust levels for Zero Trust
CREATE TABLE device_trust_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(18) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    trust_level VARCHAR(20) DEFAULT 'unknown' CHECK (trust_level IN ('trusted', 'untrusted', 'unknown', 'suspicious')),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND VERIFICATION TABLES (Updated for 18-char Custom IDs)
-- ============================================================================

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_custom_id VARCHAR(18) REFERENCES user_profiles(custom_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification attempts table
CREATE TABLE verification_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    verifier_custom_id VARCHAR(18) REFERENCES user_profiles(custom_id) ON DELETE SET NULL,
    verification_method VARCHAR(50) NOT NULL,
    verification_result BOOLEAN NOT NULL,
    verification_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schema version tracking
CREATE TABLE schema_version (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_custom_id ON user_profiles(custom_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);

-- Wallets indexes
CREATE INDEX idx_wallets_custom_id ON wallets(custom_id);
CREATE INDEX idx_wallets_address ON wallets(wallet_address);
CREATE INDEX idx_wallets_user_profile ON wallets(user_profile_id);
CREATE INDEX idx_wallets_security_level ON wallets(security_level);

-- Challenges indexes
CREATE INDEX idx_challenges_wallet_address ON challenges(wallet_address);
CREATE INDEX idx_challenges_expires_at ON challenges(expires_at);
CREATE INDEX idx_challenges_used ON challenges(used);

-- Auth sessions indexes
CREATE INDEX idx_auth_sessions_custom_id ON auth_sessions(custom_id);
CREATE INDEX idx_auth_sessions_wallet_address ON auth_sessions(wallet_address);
CREATE INDEX idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX idx_auth_sessions_active ON auth_sessions(is_active);

-- Documents indexes
CREATE INDEX idx_documents_uploader ON documents(uploader_custom_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);

-- Document signatures indexes
CREATE INDEX idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_signer ON document_signatures(signer_custom_id);
CREATE INDEX idx_document_signatures_timestamp ON document_signatures(signature_timestamp);

-- Security events indexes
CREATE INDEX idx_security_events_custom_id ON security_events(custom_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_risk_score ON security_events(risk_score);

-- Device trust indexes
CREATE INDEX idx_device_trust_custom_id ON device_trust_levels(custom_id);
CREATE INDEX idx_device_trust_fingerprint ON device_trust_levels(device_fingerprint);
CREATE INDEX idx_device_trust_level ON device_trust_levels(trust_level);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_custom_id ON audit_logs(user_custom_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- DATABASE FUNCTIONS (Updated for 18-char Custom IDs)
-- ============================================================================

-- Generate 18-character alphanumeric custom ID
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS generate_custom_id();

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

-- Create user with wallet (updated for 18-char Custom IDs)
-- Drop existing function first to avoid return type conflicts
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

    -- Return the created user and wallet info
    RETURN QUERY SELECT v_user_id, v_custom_id, LOWER(p_wallet_address)::VARCHAR(42);
END;
$$ LANGUAGE plpgsql;

-- Get user by wallet address (updated for 18-char Custom IDs)
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_by_wallet_address(VARCHAR(42));

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

-- Update last login (updated for 18-char Custom IDs)
-- Drop existing function first to avoid parameter type conflicts
DROP FUNCTION IF EXISTS update_last_login(VARCHAR(15));

CREATE OR REPLACE FUNCTION update_last_login(p_custom_id VARCHAR(18))
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles
    SET last_login = NOW()
    WHERE custom_id = p_custom_id;
END;
$$ LANGUAGE plpgsql;

-- Get user document summary (updated for 18-char Custom IDs)
-- Drop existing function first to avoid parameter type conflicts
DROP FUNCTION IF EXISTS get_user_document_summary(VARCHAR(15));

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

-- ============================================================================
-- ZERO TRUST SECURITY FUNCTIONS
-- ============================================================================

-- Log security event
CREATE OR REPLACE FUNCTION log_security_event(
    p_custom_id VARCHAR(18),
    p_event_type VARCHAR(50),
    p_old_security_level VARCHAR(20) DEFAULT NULL,
    p_new_security_level VARCHAR(20) DEFAULT NULL,
    p_old_encryption_version VARCHAR(20) DEFAULT NULL,
    p_new_encryption_version VARCHAR(20) DEFAULT NULL,
    p_event_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_fingerprint VARCHAR(255) DEFAULT NULL,
    p_risk_score INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_user_profile_id UUID;
    v_wallet_address VARCHAR(42);
    v_event_id UUID;
BEGIN
    -- Get user profile and wallet info
    SELECT up.id, w.wallet_address INTO v_user_profile_id, v_wallet_address
    FROM user_profiles up
    JOIN wallets w ON up.id = w.user_profile_id
    WHERE up.custom_id = p_custom_id;

    -- Insert security event
    INSERT INTO security_events (
        user_profile_id,
        custom_id,
        wallet_address,
        event_type,
        old_security_level,
        new_security_level,
        old_encryption_version,
        new_encryption_version,
        event_details,
        ip_address,
        user_agent,
        device_fingerprint,
        risk_score
    )
    VALUES (
        v_user_profile_id,
        p_custom_id,
        v_wallet_address,
        p_event_type,
        p_old_security_level,
        p_new_security_level,
        p_old_encryption_version,
        p_new_encryption_version,
        p_event_details,
        p_ip_address,
        p_user_agent,
        p_device_fingerprint,
        p_risk_score
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Update wallet security level
CREATE OR REPLACE FUNCTION update_wallet_security_level(
    p_custom_id VARCHAR(18),
    p_new_security_level VARCHAR(20),
    p_new_encryption_version VARCHAR(20) DEFAULT NULL,
    p_enhanced_encryption_data JSONB DEFAULT NULL,
    p_steganography_enabled BOOLEAN DEFAULT NULL,
    p_steganography_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_security_level VARCHAR(20);
    v_old_encryption_version VARCHAR(20);
    v_updated BOOLEAN := false;
BEGIN
    -- Get current security level
    SELECT security_level, encryption_version
    INTO v_old_security_level, v_old_encryption_version
    FROM wallets w
    JOIN user_profiles up ON w.user_profile_id = up.id
    WHERE up.custom_id = p_custom_id;

    -- Update wallet security settings
    UPDATE wallets
    SET
        security_level = p_new_security_level,
        encryption_version = COALESCE(p_new_encryption_version, encryption_version),
        enhanced_encryption_data = COALESCE(p_enhanced_encryption_data, enhanced_encryption_data),
        steganography_enabled = COALESCE(p_steganography_enabled, steganography_enabled),
        steganography_metadata = COALESCE(p_steganography_metadata, steganography_metadata),
        updated_at = NOW()
    WHERE user_profile_id = (
        SELECT id FROM user_profiles WHERE custom_id = p_custom_id
    );

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    -- Log security event if update was successful
    IF v_updated THEN
        PERFORM log_security_event(
            p_custom_id,
            'SECURITY_UPGRADE',
            v_old_security_level,
            p_new_security_level,
            v_old_encryption_version,
            p_new_encryption_version,
            jsonb_build_object(
                'steganography_enabled', p_steganography_enabled,
                'has_enhanced_data', p_enhanced_encryption_data IS NOT NULL
            )
        );
    END IF;

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Get security statistics
CREATE OR REPLACE FUNCTION get_security_statistics()
RETURNS TABLE(
    total_users BIGINT,
    standard_security BIGINT,
    enhanced_security BIGINT,
    maximum_security BIGINT,
    steganography_enabled BIGINT,
    recent_security_events BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE w.security_level = 'standard') as standard_security,
        COUNT(*) FILTER (WHERE w.security_level = 'enhanced') as enhanced_security,
        COUNT(*) FILTER (WHERE w.security_level = 'maximum') as maximum_security,
        COUNT(*) FILTER (WHERE w.steganography_enabled = true) as steganography_enabled,
        (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours') as recent_security_events
    FROM user_profiles up
    JOIN wallets w ON up.id = w.user_profile_id
    WHERE up.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC AUDITING
-- ============================================================================

-- Function to automatically log wallet changes
CREATE OR REPLACE FUNCTION audit_wallet_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log security level changes
    IF OLD.security_level IS DISTINCT FROM NEW.security_level THEN
        PERFORM log_security_event(
            NEW.custom_id,
            CASE
                WHEN NEW.security_level > OLD.security_level THEN 'SECURITY_UPGRADE'
                ELSE 'SECURITY_DOWNGRADE'
            END,
            OLD.security_level,
            NEW.security_level,
            OLD.encryption_version,
            NEW.encryption_version,
            jsonb_build_object(
                'trigger', 'wallet_update',
                'changed_fields', jsonb_build_array('security_level')
            )
        );
    END IF;

    -- Log encryption version changes
    IF OLD.encryption_version IS DISTINCT FROM NEW.encryption_version THEN
        PERFORM log_security_event(
            NEW.custom_id,
            'ENCRYPTION_CHANGE',
            OLD.security_level,
            NEW.security_level,
            OLD.encryption_version,
            NEW.encryption_version,
            jsonb_build_object(
                'trigger', 'wallet_update',
                'changed_fields', jsonb_build_array('encryption_version')
            )
        );
    END IF;

    -- Log steganography changes
    IF OLD.steganography_enabled IS DISTINCT FROM NEW.steganography_enabled THEN
        PERFORM log_security_event(
            NEW.custom_id,
            CASE
                WHEN NEW.steganography_enabled THEN 'STEGANOGRAPHY_ENABLED'
                ELSE 'STEGANOGRAPHY_DISABLED'
            END,
            OLD.security_level,
            NEW.security_level,
            OLD.encryption_version,
            NEW.encryption_version,
            jsonb_build_object(
                'trigger', 'wallet_update',
                'steganography_enabled', NEW.steganography_enabled
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet changes
CREATE TRIGGER trigger_audit_wallet_changes
    AFTER UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION audit_wallet_changes();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_multi_signature_requests_updated_at
    BEFORE UPDATE ON multi_signature_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_security_configurations_updated_at
    BEFORE UPDATE ON security_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_device_trust_levels_updated_at
    BEFORE UPDATE ON device_trust_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERMISSIONS AND SECURITY
-- ============================================================================

-- Create roles for different access levels
DO $$
BEGIN
    -- Create roles if they don't exist
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'signtusk_app') THEN
        CREATE ROLE signtusk_app;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'signtusk_readonly') THEN
        CREATE ROLE signtusk_readonly;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'signtusk_admin') THEN
        CREATE ROLE signtusk_admin;
    END IF;
END $$;

-- Grant permissions to application role
GRANT USAGE ON SCHEMA public TO signtusk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO signtusk_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO signtusk_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO signtusk_app;

-- Grant read-only permissions
GRANT USAGE ON SCHEMA public TO signtusk_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO signtusk_readonly;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO signtusk_readonly;

-- Grant admin permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO signtusk_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO signtusk_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO signtusk_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO signtusk_admin;

-- Enable Row Level Security on sensitive tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_trust_levels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (examples - adjust based on your authentication system)
-- Users can only see their own data
CREATE POLICY user_profiles_policy ON user_profiles
    FOR ALL TO signtusk_app
    USING (custom_id = current_setting('app.current_user_custom_id', true));

CREATE POLICY wallets_policy ON wallets
    FOR ALL TO signtusk_app
    USING (custom_id = current_setting('app.current_user_custom_id', true));

CREATE POLICY security_events_policy ON security_events
    FOR ALL TO signtusk_app
    USING (custom_id = current_setting('app.current_user_custom_id', true));

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ============================================================================

-- Insert sample schema version
INSERT INTO schema_version (version, description)
VALUES ('2.0.0', 'Complete SignTusk schema with Zero Trust security and 18-character Custom IDs');

-- Sample security configuration types
INSERT INTO security_configurations (
    user_profile_id,
    custom_id,
    config_type,
    config_data
)
SELECT
    up.id,
    up.custom_id,
    'default_security_settings',
    jsonb_build_object(
        'preferred_security_level', 'standard',
        'auto_upgrade_enabled', false,
        'steganography_preference', false,
        'device_trust_required', false
    )
FROM user_profiles up
WHERE up.id IS NOT NULL
LIMIT 0; -- Set to 0 to prevent actual insertion, remove LIMIT to insert

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to clean up expired challenges
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS cleanup_expired_challenges();
DROP FUNCTION IF EXISTS clean_expired_challenges();

CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM challenges
    WHERE expires_at < NOW() OR used = true;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log cleanup action
    INSERT INTO audit_logs (action, details, timestamp)
    VALUES (
        'CLEANUP_EXPIRED_CHALLENGES',
        jsonb_build_object('deleted_count', deleted_count),
        NOW()
    );

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired auth sessions
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS clean_expired_sessions();

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth_sessions
    WHERE expires_at < NOW() OR is_active = false;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log cleanup action
    INSERT INTO audit_logs (action, details, timestamp)
    VALUES (
        'CLEANUP_EXPIRED_SESSIONS',
        jsonb_build_object('deleted_count', deleted_count),
        NOW()
    );

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old security events
CREATE OR REPLACE FUNCTION archive_old_security_events(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- In a real implementation, you might move to an archive table
    -- For now, we'll just delete very old events
    DELETE FROM security_events
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND risk_score < 50; -- Keep high-risk events longer

    GET DIAGNOSTICS archived_count = ROW_COUNT;

    -- Log archive action
    INSERT INTO audit_logs (action, details, timestamp)
    VALUES (
        'ARCHIVE_SECURITY_EVENTS',
        jsonb_build_object(
            'archived_count', archived_count,
            'days_to_keep', days_to_keep
        ),
        NOW()
    );

    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FINAL SETUP AND VERIFICATION
-- ============================================================================

-- Verify schema integrity
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION';

    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';

    -- Log schema setup completion
    INSERT INTO audit_logs (action, details, timestamp)
    VALUES (
        'SCHEMA_SETUP_COMPLETE',
        jsonb_build_object(
            'tables_created', table_count,
            'functions_created', function_count,
            'indexes_created', index_count,
            'schema_version', '2.0.0'
        ),
        NOW()
    );

    RAISE NOTICE 'SignTusk Zero Trust Schema Setup Complete!';
    RAISE NOTICE 'Tables: %, Functions: %, Indexes: %', table_count, function_count, index_count;
    RAISE NOTICE 'Schema Version: 2.0.0';
    RAISE NOTICE 'Custom ID Length: 18 characters';
    RAISE NOTICE 'Zero Trust Security: Enabled';
END $$;

-- Show final schema summary
SELECT
    'Schema Setup Complete' as status,
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

-- Show security features enabled
SELECT
    'Zero Trust Features' as feature_category,
    jsonb_build_object(
        'custom_id_length', 18,
        'security_levels', ARRAY['standard', 'enhanced', 'maximum'],
        'steganography_support', true,
        'device_trust_tracking', true,
        'security_event_logging', true,
        'row_level_security', true
    ) as features_enabled;

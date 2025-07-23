-- Complete SignTusk Database Schema
-- Combines User Identity Management + Document Signing System
-- Ensures consistent custom_id and wallet_address across sessions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USER IDENTITY MANAGEMENT TABLES
-- ============================================================================

-- User profiles table to store consistent custom IDs
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Wallets table to store consistent wallet addresses linked to user profiles
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(15) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    encrypted_mnemonic TEXT,
    salt VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_primary BOOLEAN DEFAULT true
);

-- Authentication sessions table for secure session management
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    custom_id VARCHAR(15) NOT NULL REFERENCES user_profiles(custom_id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL REFERENCES wallets(wallet_address) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    nonce VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- ============================================================================
-- DOCUMENT SIGNING SYSTEM TABLES
-- ============================================================================

-- Documents table to store document information
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    original_hash VARCHAR(64) NOT NULL,
    signed_hash VARCHAR(64),
    supabase_path VARCHAR(500) NOT NULL,
    signed_supabase_path VARCHAR(500),
    public_url TEXT,
    signed_public_url TEXT,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'previewed', 'accepted', 'signed', 'completed', 'rejected')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Link to user identity system
    uploader_custom_id VARCHAR(15) REFERENCES user_profiles(custom_id),
    uploader_wallet_address VARCHAR(42) REFERENCES wallets(wallet_address)
);

-- Document signatures table to store signature information
CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    signer_id VARCHAR(15) NOT NULL,
    signer_address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    signature_type VARCHAR(50) DEFAULT 'single' CHECK (signature_type IN ('single', 'multi')),
    signature_metadata JSONB,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Link to user identity system
    signer_custom_id VARCHAR(15) REFERENCES user_profiles(custom_id),
    FOREIGN KEY (signer_address) REFERENCES wallets(wallet_address)
);

-- Audit logs table for comprehensive tracking
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id VARCHAR(15),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Link to user identity system
    user_custom_id VARCHAR(15) REFERENCES user_profiles(custom_id),
    user_wallet_address VARCHAR(42) REFERENCES wallets(wallet_address)
);

-- Multi-signature requests table
CREATE TABLE multi_signature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    initiator_id VARCHAR(15) NOT NULL,
    initiator_address VARCHAR(42) NOT NULL,
    required_signers INTEGER NOT NULL,
    current_signers INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    -- Link to user identity system
    initiator_custom_id VARCHAR(15) REFERENCES user_profiles(custom_id),
    FOREIGN KEY (initiator_address) REFERENCES wallets(wallet_address)
);

-- Required signers for multi-signature documents
CREATE TABLE required_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    multi_signature_request_id UUID REFERENCES multi_signature_requests(id) ON DELETE CASCADE,
    signer_id VARCHAR(15) NOT NULL,
    signer_address VARCHAR(42),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Link to user identity system
    signer_custom_id VARCHAR(15) REFERENCES user_profiles(custom_id),
    FOREIGN KEY (signer_address) REFERENCES wallets(wallet_address)
);

-- Verification attempts table
CREATE TABLE verification_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    verifier_ip INET,
    verification_result BOOLEAN NOT NULL,
    verification_details JSONB,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Link to user identity system
    verifier_custom_id VARCHAR(15) REFERENCES user_profiles(custom_id),
    verifier_wallet_address VARCHAR(42) REFERENCES wallets(wallet_address)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User Identity System Indexes
CREATE INDEX idx_user_profiles_custom_id ON user_profiles(custom_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX idx_user_profiles_last_login ON user_profiles(last_login);

CREATE INDEX idx_wallets_custom_id ON wallets(custom_id);
CREATE INDEX idx_wallets_wallet_address ON wallets(wallet_address);
CREATE INDEX idx_wallets_user_profile_id ON wallets(user_profile_id);
CREATE INDEX idx_wallets_is_primary ON wallets(is_primary);

CREATE INDEX idx_auth_sessions_custom_id ON auth_sessions(custom_id);
CREATE INDEX idx_auth_sessions_wallet_address ON auth_sessions(wallet_address);
CREATE INDEX idx_auth_sessions_session_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- Document System Indexes
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_uploader_custom_id ON documents(uploader_custom_id);
CREATE INDEX idx_documents_uploader_wallet_address ON documents(uploader_wallet_address);

CREATE INDEX idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_signer_id ON document_signatures(signer_id);
CREATE INDEX idx_document_signatures_signer_custom_id ON document_signatures(signer_custom_id);
CREATE INDEX idx_document_signatures_signer_address ON document_signatures(signer_address);

CREATE INDEX idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_user_custom_id ON audit_logs(user_custom_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

CREATE INDEX idx_multi_signature_requests_status ON multi_signature_requests(status);
CREATE INDEX idx_multi_signature_requests_initiator_custom_id ON multi_signature_requests(initiator_custom_id);

CREATE INDEX idx_required_signers_signer_id ON required_signers(signer_id);
CREATE INDEX idx_required_signers_signer_custom_id ON required_signers(signer_custom_id);

CREATE INDEX idx_verification_attempts_document_id ON verification_attempts(document_id);
CREATE INDEX idx_verification_attempts_verifier_custom_id ON verification_attempts(verifier_custom_id);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- User Identity System Triggers
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at 
    BEFORE UPDATE ON wallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Document System Triggers
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CUSTOM FUNCTIONS
-- ============================================================================

-- Function to generate unique custom ID
CREATE OR REPLACE FUNCTION generate_custom_id()
RETURNS VARCHAR(15) AS $$
DECLARE
    letters CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    numbers CONSTANT TEXT := '0123456789';
    custom_id VARCHAR(15);
    exists_check INTEGER;
BEGIN
    LOOP
        -- Generate custom ID: 3 letters + 4 numbers + 4 letters + 4 numbers
        custom_id := '';
        
        -- First 3 letters
        FOR i IN 1..3 LOOP
            custom_id := custom_id || substr(letters, floor(random() * length(letters) + 1)::int, 1);
        END LOOP;
        
        -- 4 numbers
        FOR i IN 1..4 LOOP
            custom_id := custom_id || substr(numbers, floor(random() * length(numbers) + 1)::int, 1);
        END LOOP;
        
        -- 4 letters
        FOR i IN 1..4 LOOP
            custom_id := custom_id || substr(letters, floor(random() * length(letters) + 1)::int, 1);
        END LOOP;
        
        -- 4 numbers
        FOR i IN 1..4 LOOP
            custom_id := custom_id || substr(numbers, floor(random() * length(numbers) + 1)::int, 1);
        END LOOP;
        
        -- Check if this custom_id already exists
        SELECT COUNT(*) INTO exists_check 
        FROM user_profiles 
        WHERE user_profiles.custom_id = custom_id;
        
        -- If unique, break the loop
        IF exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN custom_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile with wallet (Sign-up)
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
    
    -- Return the created user and wallet info
    RETURN QUERY SELECT v_user_id, v_custom_id, LOWER(p_wallet_address);
END;
$$ LANGUAGE plpgsql;

-- Function to get user by wallet address (Login)
CREATE OR REPLACE FUNCTION get_user_by_wallet_address(p_wallet_address VARCHAR(42))
RETURNS TABLE(
    user_id UUID,
    custom_id VARCHAR(15),
    wallet_address VARCHAR(42),
    encrypted_private_key TEXT,
    encrypted_mnemonic TEXT,
    salt VARCHAR(64),
    display_name VARCHAR(100),
    email VARCHAR(255),
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
        up.last_login
    FROM user_profiles up
    INNER JOIN wallets w ON up.id = w.user_profile_id
    WHERE w.wallet_address = LOWER(p_wallet_address)
    AND up.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login(p_custom_id VARCHAR(15))
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles 
    SET last_login = NOW() 
    WHERE custom_id = p_custom_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE(
    total_documents BIGINT,
    signed_documents BIGINT,
    pending_documents BIGINT,
    total_signatures BIGINT,
    active_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM documents WHERE status IN ('signed', 'completed')) as signed_documents,
        (SELECT COUNT(*) FROM documents WHERE status IN ('uploaded', 'previewed', 'accepted')) as pending_documents,
        (SELECT COUNT(*) FROM document_signatures) as total_signatures,
        (SELECT COUNT(*) FROM user_profiles WHERE is_active = true) as active_users;
END;
$$ LANGUAGE plpgsql;

-- Function to get user document summary
CREATE OR REPLACE FUNCTION get_user_document_summary(p_custom_id VARCHAR(15))
RETURNS TABLE(
    total_documents BIGINT,
    signed_documents BIGINT,
    pending_documents BIGINT,
    rejected_documents BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM documents WHERE uploader_custom_id = p_custom_id) as total_documents,
        (SELECT COUNT(*) FROM documents WHERE uploader_custom_id = p_custom_id AND status IN ('signed', 'completed')) as signed_documents,
        (SELECT COUNT(*) FROM documents WHERE uploader_custom_id = p_custom_id AND status IN ('uploaded', 'previewed', 'accepted')) as pending_documents,
        (SELECT COUNT(*) FROM documents WHERE uploader_custom_id = p_custom_id AND status = 'rejected') as rejected_documents;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Create a view for easy user lookup
CREATE VIEW user_wallet_view AS
SELECT 
    up.id as user_id,
    up.custom_id,
    up.display_name,
    up.email,
    up.created_at as user_created_at,
    up.last_login,
    up.is_active,
    w.wallet_address,
    w.encrypted_private_key,
    w.encrypted_mnemonic,
    w.salt,
    w.created_at as wallet_created_at,
    w.is_primary
FROM user_profiles up
INNER JOIN wallets w ON up.id = w.user_profile_id
WHERE up.is_active = true;

-- Create a view for document with user information
CREATE VIEW document_user_view AS
SELECT 
    d.*,
    up.display_name as uploader_name,
    up.email as uploader_email
FROM documents d
LEFT JOIN user_profiles up ON d.uploader_custom_id = up.custom_id;

-- Create a view for signatures with user information
CREATE VIEW signature_user_view AS
SELECT 
    ds.*,
    up.display_name as signer_name,
    up.email as signer_email
FROM document_signatures ds
LEFT JOIN user_profiles up ON ds.signer_custom_id = up.custom_id;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE required_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (true); -- Adjust based on session management

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (true); -- Adjust based on session management

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallets" ON wallets
    FOR SELECT USING (true); -- Adjust based on session management

CREATE POLICY "Users can update their own wallets" ON wallets
    FOR UPDATE USING (true); -- Adjust based on session management

CREATE POLICY "Users can insert their own wallets" ON wallets
    FOR INSERT WITH CHECK (true);

-- RLS Policies for auth_sessions
CREATE POLICY "Users can view their own sessions" ON auth_sessions
    FOR SELECT USING (true); -- Adjust based on session management

CREATE POLICY "Users can insert their own sessions" ON auth_sessions
    FOR INSERT WITH CHECK (true); -- Adjust based on session management

CREATE POLICY "Users can delete their own sessions" ON auth_sessions
    FOR DELETE USING (true); -- Adjust based on session management

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (true); -- Adjust based on user identification

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (true); -- Adjust based on user identification

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (true); -- Adjust based on user identification

-- RLS Policies for document_signatures
CREATE POLICY "Users can view signatures" ON document_signatures
    FOR SELECT USING (true);

CREATE POLICY "Users can insert signatures" ON document_signatures
    FOR INSERT WITH CHECK (true);

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs" ON audit_logs
    FOR SELECT USING (true);

CREATE POLICY "Users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for multi_signature_requests
CREATE POLICY "Users can view multi-signature requests" ON multi_signature_requests
    FOR SELECT USING (true);

CREATE POLICY "Users can insert multi-signature requests" ON multi_signature_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update multi-signature requests" ON multi_signature_requests
    FOR UPDATE USING (true);

-- RLS Policies for required_signers
CREATE POLICY "Users can view required signers" ON required_signers
    FOR SELECT USING (true);

CREATE POLICY "Users can insert required signers" ON required_signers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update required signers" ON required_signers
    FOR UPDATE USING (true);

-- RLS Policies for verification_attempts
CREATE POLICY "Users can view verification attempts" ON verification_attempts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert verification attempts" ON verification_attempts
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON wallets TO authenticated;
GRANT ALL ON auth_sessions TO authenticated;
GRANT ALL ON documents TO authenticated;
GRANT ALL ON document_signatures TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON multi_signature_requests TO authenticated;
GRANT ALL ON required_signers TO authenticated;
GRANT ALL ON verification_attempts TO authenticated;

-- Grant access to views
GRANT SELECT ON user_wallet_view TO authenticated;
GRANT SELECT ON document_user_view TO authenticated;
GRANT SELECT ON signature_user_view TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_custom_id() TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_wallet_address(VARCHAR(42)) TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_login(VARCHAR(15)) TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_document_summary(VARCHAR(15)) TO authenticated;

-- ============================================================================
-- INITIAL DATA / SETUP
-- ============================================================================

-- Create an admin function to clean up old data periodically
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Clean expired sessions
    PERFORM clean_expired_sessions();
    
    -- Clean old audit logs (older than 1 year)
    DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '1 year';
    
    -- Clean old verification attempts (older than 6 months)
    DELETE FROM verification_attempts WHERE verified_at < NOW() - INTERVAL '6 months';
    
    -- Log cleanup action
    INSERT INTO audit_logs (action, details, timestamp)
    VALUES ('SYSTEM_CLEANUP', '{"action": "automated_cleanup", "timestamp": "' || NOW() || '"}', NOW());
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_data() TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'Stores user profiles with consistent custom IDs';
COMMENT ON TABLE wallets IS 'Stores wallet addresses linked to user profiles';
COMMENT ON TABLE auth_sessions IS 'Manages authentication sessions';
COMMENT ON TABLE documents IS 'Stores document information for signing';
COMMENT ON TABLE document_signatures IS 'Stores signature information';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail';
COMMENT ON TABLE multi_signature_requests IS 'Multi-signature workflow requests';
COMMENT ON TABLE required_signers IS 'Required signers for multi-signature documents';
COMMENT ON TABLE verification_attempts IS 'Document verification attempts';

COMMENT ON FUNCTION generate_custom_id() IS 'Generates unique 15-character custom ID';
COMMENT ON FUNCTION create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) IS 'Creates user profile with wallet atomically';
COMMENT ON FUNCTION get_user_by_wallet_address(VARCHAR(42)) IS 'Retrieves user by wallet address for login';
COMMENT ON FUNCTION update_last_login(VARCHAR(15)) IS 'Updates last login timestamp';
COMMENT ON FUNCTION clean_expired_sessions() IS 'Removes expired authentication sessions';
COMMENT ON FUNCTION get_document_stats() IS 'Returns document statistics';
COMMENT ON FUNCTION get_user_document_summary(VARCHAR(15)) IS 'Returns user-specific document summary';

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================

-- Create a table to track schema version
CREATE TABLE schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Insert current schema version
INSERT INTO schema_version (version, description) 
VALUES ('1.0.0', 'Complete SignTusk schema with user identity management and document signing system');

-- Grant permissions
GRANT SELECT ON schema_version TO authenticated;
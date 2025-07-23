-- User Identity Management Schema for SignTusk
-- This schema ensures consistent custom_id and wallet_address across sessions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_custom_id ON user_profiles(custom_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_wallets_custom_id ON wallets(custom_id);
CREATE INDEX idx_wallets_wallet_address ON wallets(wallet_address);
CREATE INDEX idx_wallets_user_profile_id ON wallets(user_profile_id);
CREATE INDEX idx_auth_sessions_custom_id ON auth_sessions(custom_id);
CREATE INDEX idx_auth_sessions_wallet_address ON auth_sessions(wallet_address);
CREATE INDEX idx_auth_sessions_session_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at 
    BEFORE UPDATE ON wallets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

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

-- Function to create user profile with wallet
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

-- Function to get user by wallet address (for login)
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

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (true); -- Adjust based on session management

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (true); -- Adjust based on session management

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallets" ON wallets
    FOR SELECT USING (true); -- Adjust based on session management

CREATE POLICY "Users can update their own wallets" ON wallets
    FOR UPDATE USING (true); -- Adjust based on session management

-- RLS Policies for auth_sessions
CREATE POLICY "Users can view their own sessions" ON auth_sessions
    FOR SELECT USING (true); -- Adjust based on session management

CREATE POLICY "Users can insert their own sessions" ON auth_sessions
    FOR INSERT WITH CHECK (true); -- Adjust based on session management

-- Grant permissions to authenticated users
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON wallets TO authenticated;
GRANT ALL ON auth_sessions TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a view for easy user lookup
CREATE VIEW user_wallet_view AS
SELECT 
    up.id as user_id,
    up.custom_id,
    up.display_name,
    up.email,
    up.created_at as user_created_at,
    up.last_login,
    w.wallet_address,
    w.encrypted_private_key,
    w.encrypted_mnemonic,
    w.salt,
    w.created_at as wallet_created_at,
    w.is_primary
FROM user_profiles up
INNER JOIN wallets w ON up.id = w.user_profile_id
WHERE up.is_active = true;

-- Grant access to the view
GRANT SELECT ON user_wallet_view TO authenticated;
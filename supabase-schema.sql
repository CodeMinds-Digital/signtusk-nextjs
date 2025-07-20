-- SignTusk Database Schema for Supabase
-- This file contains the SQL commands to set up the database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create challenges table for authentication nonces
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_challenges_address ON challenges(wallet_address);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

-- Create function to extract wallet address from JWT
-- Note: This function is created in the public schema since we don't have auth schema permissions
CREATE OR REPLACE FUNCTION get_jwt_wallet_address() 
RETURNS TEXT AS $
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'wallet_address', '')::text;
$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable Row Level Security (RLS)
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets table
CREATE POLICY "Users can view their own wallet" ON wallets
  FOR SELECT USING (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can insert their own wallet" ON wallets
  FOR INSERT WITH CHECK (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can update their own wallet" ON wallets
  FOR UPDATE USING (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can delete their own wallet" ON wallets
  FOR DELETE USING (get_jwt_wallet_address() = wallet_address);

-- RLS Policies for challenges table
CREATE POLICY "Users can view their own challenges" ON challenges
  FOR SELECT USING (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can insert their own challenges" ON challenges
  FOR INSERT WITH CHECK (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can delete their own challenges" ON challenges
  FOR DELETE USING (get_jwt_wallet_address() = wallet_address);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on wallets table
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Note: You may want to set up a cron job or scheduled function to periodically call cleanup_expired_challenges()
-- This can be done in Supabase using pg_cron extension or Edge Functions

-- Grant necessary permissions (adjust as needed for your setup)
-- These are typically handled automatically by Supabase, but included for completeness

-- Example of additional table for user data (optional)
-- You can extend this schema based on your application needs
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL REFERENCES wallets(wallet_address) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles table
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can delete their own profile" ON user_profiles
  FOR DELETE USING (get_jwt_wallet_address() = wallet_address);

-- Create trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
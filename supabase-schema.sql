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

-- Challenges table removed as it's not being used

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);

-- Create function to extract wallet address from JWT
-- Note: This function is created in the public schema since we don't have auth schema permissions
CREATE OR REPLACE FUNCTION get_jwt_wallet_address() 
RETURNS TEXT AS $
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'wallet_address', '')::text;
$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable Row Level Security (RLS)
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets table
CREATE POLICY "Users can view their own wallet" ON wallets
  FOR SELECT USING (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can insert their own wallet" ON wallets
  FOR INSERT WITH CHECK (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can update their own wallet" ON wallets
  FOR UPDATE USING (get_jwt_wallet_address() = wallet_address);

CREATE POLICY "Users can delete their own wallet" ON wallets
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


-- Grant necessary permissions (adjust as needed for your setup)
-- These are typically handled automatically by Supabase, but included for completeness

-- Example of additional table for user data (optional)
-- You can extend this schema based on your application needs
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL REFERENCES wallets(wallet_address) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  mobile TEXT,
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
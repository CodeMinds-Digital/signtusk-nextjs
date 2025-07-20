-- Migration script to update existing Supabase database
-- Run this script in your Supabase SQL editor to apply the changes

-- Step 1: Add email and mobile columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS mobile TEXT;

-- Step 2: Drop the unused challenges table and related objects
-- First drop the policies
DROP POLICY IF EXISTS "Users can view their own challenges" ON challenges;
DROP POLICY IF EXISTS "Users can insert their own challenges" ON challenges;
DROP POLICY IF EXISTS "Users can delete their own challenges" ON challenges;

-- Drop the indexes
DROP INDEX IF EXISTS idx_challenges_address;
DROP INDEX IF EXISTS idx_challenges_expires;

-- Drop the cleanup function (if it exists)
DROP FUNCTION IF EXISTS cleanup_expired_challenges();

-- Finally drop the table
DROP TABLE IF EXISTS challenges;

-- Step 3: Add indexes for the new email and mobile fields (optional, for better performance)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_mobile ON user_profiles(mobile);

-- Migration completed successfully
-- The user_profiles table now has email and mobile fields
-- The unused challenges table has been removed
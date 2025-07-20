import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if we're in build time and environment variables are missing
const isBuildTime = process.env.NODE_ENV === 'production' && !supabaseUrl;

if (!isBuildTime && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables');
}

// Create clients with fallback values for build time
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceRoleKey || 'placeholder-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database types
export interface Wallet {
  id: string;
  wallet_address: string;
  encrypted_private_key: string;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  wallet_address: string;
  nonce: string;
  expires_at: string;
  created_at: string;
}
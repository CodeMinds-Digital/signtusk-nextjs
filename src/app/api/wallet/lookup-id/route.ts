import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for admin access (no RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { wallet_address } = await request.json();

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Normalize wallet address
    const normalizedAddress = wallet_address.toLowerCase();

    // Look up the custom_id for this wallet address
    // First get the wallet to find the user_profile_id
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('user_profile_id')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (walletError) {
      // If wallet not found in database, return null (not an error)
      if (walletError.code === 'PGRST116') {
        return NextResponse.json({ custom_id: null });
      }

      console.error('Wallet lookup error:', walletError);
      return NextResponse.json(
        { error: 'Wallet lookup failed' },
        { status: 500 }
      );
    }

    // Now get the user profile to get the custom_id
    const { data, error } = await supabase
      .from('user_profiles')
      .select('custom_id')
      .eq('id', walletData.user_profile_id)
      .single();

    if (error) {
      // If wallet not found in database, return null (not an error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ custom_id: null });
      }

      console.error('Database lookup error:', error);
      return NextResponse.json(
        { error: 'Database lookup failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ custom_id: data?.custom_id || null });
  } catch (error) {
    console.error('Lookup ID error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

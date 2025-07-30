import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { custom_id } = await request.json();

    if (!custom_id) {
      return NextResponse.json(
        { error: 'Missing custom_id parameter' },
        { status: 400 }
      );
    }

    // Check if custom_id already exists in the database
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('custom_id')
      .eq('custom_id', custom_id.toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database error checking custom_id:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Return whether the custom_id exists
    return NextResponse.json({
      exists: !!data,
      custom_id: custom_id.toUpperCase()
    });

  } catch (error) {
    console.error('Error checking custom_id uniqueness:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

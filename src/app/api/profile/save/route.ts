import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for demo purposes
// In production, use a proper database or IPFS
const profiles = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { address, encryptedProfile, signature } = await request.json();

    if (!address || !encryptedProfile) {
      return NextResponse.json(
        { error: 'Missing required fields: address, encryptedProfile' },
        { status: 400 }
      );
    }

    // In production, verify the signature here
    // For now, we'll just store the encrypted profile

    profiles.set(address.toLowerCase(), {
      encryptedProfile,
      timestamp: Date.now(),
      signature
    });

    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully'
    });

  } catch (error) {
    console.error('Profile save error:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    const profile = profiles.get(address.toLowerCase());

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: profile.encryptedProfile,
      timestamp: profile.timestamp
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
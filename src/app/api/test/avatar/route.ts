import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // This is a simple test to verify multiavatar is working
    const { generateAvatarWithFallback } = await import('@/lib/avatar-generator');
    
    const seed = request.nextUrl.searchParams.get('seed') || 'test-wallet-address';
    
    // Generate avatar
    const avatarBlob = await generateAvatarWithFallback(seed, 256);
    
    // Return the image
    const buffer = await avatarBlob.arrayBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('Avatar generation test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { seed, size } = await request.json();
    
    const { generateAvatarWithFallback } = await import('@/lib/avatar-generator');
    
    // Generate avatar
    const avatarBlob = await generateAvatarWithFallback(seed || 'test', size || 256);
    
    // Convert to base64 for JSON response
    const buffer = await avatarBlob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${base64}`,
      size: buffer.byteLength,
      seed: seed || 'test'
    });
    
  } catch (error) {
    console.error('Avatar generation POST error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

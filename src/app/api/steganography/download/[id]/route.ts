/**
 * API route for downloading steganographic images
 * GET /api/steganography/download/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getSteganographicImageById, updateDownloadStats, logSteganographicAccess } from '@/lib/steganography-storage';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const imageId = params.id;

    // Get steganographic image metadata
    const result = await getSteganographicImageById(imageId, payload.custom_id);

    if (!result.success || !result.image) {
      await logSteganographicAccess(
        imageId,
        payload.custom_id,
        'download',
        false,
        'Image not found',
        undefined,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: 'Image not found or access denied' },
        { status: 404 }
      );
    }

    const image = result.image;

    // Check if image has expired
    if (image.expires_at && new Date(image.expires_at) < new Date()) {
      await logSteganographicAccess(
        imageId,
        payload.custom_id,
        'download',
        false,
        'Image expired',
        undefined,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: 'Image has expired' },
        { status: 410 }
      );
    }

    try {
      // Download image from Supabase storage
      const { data: imageData, error: downloadError } = await supabaseAdmin.storage
        .from('documents')
        .download(image.supabase_path);

      if (downloadError || !imageData) {
        console.error('Failed to download image from storage:', downloadError);
        
        await logSteganographicAccess(
          imageId,
          payload.custom_id,
          'download',
          false,
          'Storage download failed',
          { error: downloadError?.message },
          request.ip,
          request.headers.get('user-agent') || undefined
        );

        return NextResponse.json(
          { error: 'Failed to download image' },
          { status: 500 }
        );
      }

      // Update download statistics
      await updateDownloadStats(imageId, payload.custom_id);

      // Convert blob to array buffer
      const arrayBuffer = await imageData.arrayBuffer();

      // Determine content type
      const contentType = `image/${image.image_format.toLowerCase()}`;

      // Create response with proper headers for file download
      const response = new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${image.image_name}"`,
          'Content-Length': arrayBuffer.byteLength.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      return response;

    } catch (error) {
      console.error('Error processing image download:', error);
      
      await logSteganographicAccess(
        imageId,
        payload.custom_id,
        'download',
        false,
        'Processing error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: 'Failed to process image download' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error downloading steganographic image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

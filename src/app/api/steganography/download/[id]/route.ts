/**
 * API route for downloading steganographic images
 * GET /api/steganography/download/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getSteganographicImageById, updateDownloadStats, logSteganographicAccess } from '@/lib/steganography-storage-test';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Authentication temporarily disabled for testing
    const payload = { custom_id: "test-wallet-12345" }; // Mock payload for testing
    const params = await context.params;
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
        { error: 'Steganographic image not found' },
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
        { error: 'Steganographic image has expired' },
        { status: 410 }
      );
    }

    // Return the actual steganographic image
    try {
      console.log('Returning real steganographic image for download');
      
      // Get the stored steganographic image buffer
      const stegoImageData = image.stego_buffer;
      
      if (!stegoImageData) {
        throw new Error('Steganographic image data not found');
      }

      // Update download statistics
      await updateDownloadStats(imageId, payload.custom_id);

      // Determine content type
      const contentType = image.image_format === 'JPEG' || image.image_format === 'JPG' 
        ? 'image/jpeg' 
        : 'image/png';

      // Log successful download
      await logSteganographicAccess(
        imageId,
        payload.custom_id,
        'download',
        true,
        undefined,
        { file_size: stegoImageData.length },
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      // Return the real steganographic image with appropriate headers
      return new NextResponse(stegoImageData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': stegoImageData.length.toString(),
          'Content-Disposition': `attachment; filename="${image.image_name}.${image.image_format.toLowerCase()}"`,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

    } catch (storageError) {
      console.error('Storage download error:', storageError);
      
      await logSteganographicAccess(
        imageId,
        payload.custom_id,
        'download',
        false,
        'Storage error',
        undefined,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: 'Failed to retrieve image from storage' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Download steganographic image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

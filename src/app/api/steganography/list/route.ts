/**
 * API route for listing user's steganographic backups
 * GET /api/steganography/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getUserSteganographicImages, logSteganographicAccess } from '@/lib/steganography-storage';

export async function GET(request: NextRequest) {
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

    // Get user's steganographic images
    const result = await getUserSteganographicImages(payload.custom_id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Format response data (exclude sensitive information)
    const formattedImages = result.images?.map(image => ({
      id: image.id,
      imageName: image.image_name,
      originalCarrierName: image.original_carrier_name,
      dataType: image.data_type,
      encryptionVersion: image.encryption_version,
      fileSize: image.file_size,
      imageFormat: image.image_format,
      createdAt: image.created_at,
      expiresAt: image.expires_at,
      downloadCount: image.download_count,
      lastDownloadedAt: image.last_downloaded_at,
      metadata: image.metadata
    })) || [];

    // Log the view access for each image
    if (result.images && result.images.length > 0) {
      for (const image of result.images) {
        await logSteganographicAccess(
          image.id,
          payload.custom_id,
          'view',
          true,
          undefined,
          { action: 'list_view' },
          request.ip,
          request.headers.get('user-agent') || undefined
        );
      }
    }

    return NextResponse.json({
      success: true,
      images: formattedImages,
      count: formattedImages.length
    });

  } catch (error) {
    console.error('Error listing steganographic images:', error);
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

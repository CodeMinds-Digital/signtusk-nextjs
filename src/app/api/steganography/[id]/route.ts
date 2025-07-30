/**
 * API route for deleting steganographic images
 * DELETE /api/steganography/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getSteganographicImageById, deleteSteganographicImage, logSteganographicAccess } from '@/lib/steganography-storage';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Verify image exists and user owns it
    const getResult = await getSteganographicImageById(imageId, payload.custom_id);

    if (!getResult.success || !getResult.image) {
      await logSteganographicAccess(
        imageId,
        payload.custom_id,
        'delete',
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

    // Delete the steganographic image (mark as inactive)
    const deleteResult = await deleteSteganographicImage(imageId, payload.custom_id);

    if (!deleteResult.success) {
      await logSteganographicAccess(
        imageId,
        payload.custom_id,
        'delete',
        false,
        deleteResult.error,
        undefined,
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: deleteResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Steganographic image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting steganographic image:', error);
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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

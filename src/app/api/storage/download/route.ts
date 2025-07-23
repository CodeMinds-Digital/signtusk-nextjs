import { NextRequest, NextResponse } from 'next/server';
import { downloadFileFromSupabase } from '@/lib/supabase-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const bucket = searchParams.get('bucket') || 'documents';

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Download file from Supabase
    const result = await downloadFileFromSupabase(bucket, filePath);

    if (result.error) {
      console.error('Download error:', result.error);
      return NextResponse.json(
        { error: 'Download failed', details: result.error.message },
        { status: 404 }
      );
    }

    // Get file info from path
    const fileName = filePath.split('/').pop() || 'download';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    // Determine content type
    const contentTypeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const contentType = contentTypeMap[fileExtension || ''] || 'application/octet-stream';

    // Convert blob to array buffer
    const arrayBuffer = await result.data.arrayBuffer();

    // Return file as response
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filePath, bucket = 'documents' } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Download file from Supabase
    const result = await downloadFileFromSupabase(bucket, filePath);

    if (result.error) {
      return NextResponse.json(
        { error: 'Download failed', details: result.error.message },
        { status: 404 }
      );
    }

    // Convert blob to base64 for JSON response
    const arrayBuffer = await result.data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({
      success: true,
      data: {
        fileName: filePath.split('/').pop(),
        size: arrayBuffer.byteLength,
        base64: base64,
        mimeType: result.data.type
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
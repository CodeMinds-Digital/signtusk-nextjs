import { NextRequest, NextResponse } from 'next/server';
import { downloadFileFromSupabase } from '@/lib/supabase-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentHash } = await params;

    console.log(`[PDF API] Fetching PDF for document hash: ${documentHash}`);

    // Get document from database by hash (not ID)
    const { supabase } = await import('@/lib/database');
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .or(`original_hash.eq.${documentHash},signed_hash.eq.${documentHash}`)
      .limit(1);

    if (docError) {
      console.error('[PDF API] Database query error:', docError);
      return NextResponse.json(
        { error: 'Failed to query document database' },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      console.log(`[PDF API] Document not found: ${documentHash}`);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documents[0];

    // Check if document has a signed PDF
    if (!document.signed_supabase_path) {
      console.log(`[PDF API] No signed PDF available for document: ${documentHash}`);
      return NextResponse.json(
        { error: 'Signed PDF not available' },
        { status: 404 }
      );
    }

    console.log(`[PDF API] Downloading PDF from Supabase: ${document.signed_supabase_path}`);

    // Download the PDF file from Supabase Storage
    const downloadResult = await downloadFileFromSupabase('documents', document.signed_supabase_path);

    if (downloadResult.error || !downloadResult.data) {
      console.log(`[PDF API] Failed to download PDF: ${downloadResult.error?.message}`);
      return NextResponse.json(
        { error: 'PDF file not found or download failed' },
        { status: 404 }
      );
    }

    // Convert blob to buffer
    const pdfBuffer = Buffer.from(await downloadResult.data.arrayBuffer());

    console.log(`[PDF API] Successfully downloaded PDF file, size: ${pdfBuffer.length} bytes`);

    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${document.file_name || 'signed-document.pdf'}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('[PDF API] Error serving PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

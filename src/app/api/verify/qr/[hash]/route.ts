import { NextRequest, NextResponse } from 'next/server';
import { DocumentDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;

    if (!hash) {
      return NextResponse.json(
        { error: 'Document hash is required' },
        { status: 400 }
      );
    }

    // Get document and signature information from database
    const { supabase } = await import('@/lib/database');

    // Query documents table using both original_hash and signed_hash
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select(`
        *,
        document_signatures(
          id,
          signer_id,
          signer_address,
          signature,
          signature_type,
          signature_metadata,
          signed_at,
          signer_custom_id
        )
      `)
      .or(`original_hash.eq.${hash},signed_hash.eq.${hash}`)
      .limit(1);

    if (docError) {
      console.error('Database query error:', docError);
      return NextResponse.json(
        { error: 'Failed to query document database' },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documents[0];
    const signatures = document.document_signatures || [];

    // Prepare verification response
    const verificationData = {
      document: {
        id: document.id,
        fileName: document.file_name,
        fileSize: document.file_size,
        fileType: document.file_type,
        originalHash: document.original_hash,
        signedHash: document.signed_hash,
        status: document.status,
        uploadDate: document.created_at,
        lastUpdated: document.updated_at,
        metadata: document.metadata
      },
      signatures: signatures.map((sig: any) => ({
        id: sig.id,
        signerId: sig.signer_id,
        signerCustomId: sig.signer_custom_id,
        signerAddress: sig.signer_address,
        signatureType: sig.signature_type,
        signedAt: sig.signed_at,
        signatureMetadata: sig.signature_metadata,
        // Don't expose the actual signature for security
        hasSignature: !!sig.signature
      })),
      verification: {
        isValid: document.status === 'completed' || document.status === 'signed',
        signatureCount: signatures.length,
        verifiedAt: new Date().toISOString(),
        documentType: document.signed_hash ? 'signed' : 'original'
      },
      qrVerification: {
        scannedAt: new Date().toISOString(),
        verificationMethod: 'QR Code',
        documentHash: hash
      }
    };

    return NextResponse.json({
      success: true,
      data: verificationData
    });

  } catch (error) {
    console.error('QR verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}

// Also support POST for compatibility
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  return GET(request, { params });
}

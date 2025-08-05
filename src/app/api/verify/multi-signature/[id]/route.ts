import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Multi-signature request ID is required' },
        { status: 400 }
      );
    }

    // Get multi-signature request
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .select(`
        id,
        status,
        description,
        created_at,
        completed_at,
        initiator_custom_id,
        signing_type,
        required_signers,
        current_signers,
        document_id
      `)
      .eq('id', id)
      .single();

    if (multiSigError || !multiSigRequest) {
      return NextResponse.json(
        { error: 'Multi-signature request not found' },
        { status: 404 }
      );
    }

    // Get the document separately
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select(`
        id,
        file_name,
        file_size,
        file_type,
        original_hash,
        signed_hash,
        public_url,
        signed_public_url,
        status,
        created_at,
        metadata
      `)
      .eq('id', multiSigRequest.document_id)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get required signers
    const { data: requiredSigners, error: signersError } = await supabase
      .from('required_signers')
      .select(`
        id,
        signer_custom_id,
        signing_order,
        status,
        signed_at,
        signature,
        signature_metadata
      `)
      .eq('multi_signature_request_id', id)
      .order('signing_order', { ascending: true });

    if (signersError) {
      return NextResponse.json(
        { error: 'Failed to fetch signers' },
        { status: 500 }
      );
    }

    // Process signers data
    const signers = (requiredSigners || []).map((signer: any) => ({
      id: signer.id,
      signerCustomId: signer.signer_custom_id,
      signingOrder: signer.signing_order,
      status: signer.status,
      signedAt: signer.signed_at,
      hasSignature: !!signer.signature,
      signatureMetadata: signer.signature_metadata
    }));

    // Calculate verification status
    const completedSigners = signers.filter((s: any) => s.status === 'signed');
    const totalSigners = signers.length;
    const isFullyExecuted = multiSigRequest.status === 'completed' && completedSigners.length === totalSigners;

    // Prepare verification response
    const verificationData = {
      multiSignatureRequest: {
        id: multiSigRequest.id,
        status: multiSigRequest.status,
        description: multiSigRequest.description,
        signingType: multiSigRequest.signing_type,
        initiatorCustomId: multiSigRequest.initiator_custom_id,
        createdAt: multiSigRequest.created_at,
        completedAt: multiSigRequest.completed_at,
        requiredSigners: multiSigRequest.required_signers,
        currentSigners: multiSigRequest.current_signers
      },
      document: {
        id: document.id,
        fileName: document.file_name,
        fileSize: document.file_size,
        fileType: document.file_type,
        originalHash: document.original_hash,
        signedHash: document.signed_hash,
        publicUrl: document.public_url,
        signedPublicUrl: document.signed_public_url,
        status: document.status,
        uploadDate: document.created_at,
        metadata: document.metadata
      },
      signers: signers.sort((a: any, b: any) => a.signingOrder - b.signingOrder),
      progress: {
        completed: completedSigners.length,
        total: totalSigners,
        percentage: totalSigners > 0 ? Math.round((completedSigners.length / totalSigners) * 100) : 0
      },
      verification: {
        isValid: isFullyExecuted,
        isPartiallyExecuted: completedSigners.length > 0 && completedSigners.length < totalSigners,
        isFullyExecuted: isFullyExecuted,
        signatureCount: completedSigners.length,
        totalRequiredSignatures: totalSigners,
        completionPercentage: totalSigners > 0 ? Math.round((completedSigners.length / totalSigners) * 100) : 0,
        verifiedAt: new Date().toISOString(),
        documentType: 'multi-signature'
      },
      qrVerification: {
        scannedAt: new Date().toISOString(),
        verificationMethod: 'Multi-Signature QR Code',
        multiSignatureRequestId: id,
        documentHash: document.original_hash
      },
      timeline: signers.map((signer: any) => ({
        order: signer.signingOrder + 1,
        signerCustomId: signer.signerCustomId,
        status: signer.status,
        signedAt: signer.signedAt,
        hasSignature: signer.hasSignature
      }))
    };

    return NextResponse.json({
      success: true,
      data: verificationData
    });

  } catch (error) {
    console.error('Multi-signature QR verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}

// Also support POST for compatibility
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return GET(request, { params });
}

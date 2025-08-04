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

    // Get multi-signature request with all related data
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
        documents (
          id,
          file_name,
          file_size,
          file_type,
          original_hash,
          signed_hash,
          public_url,
          created_at,
          metadata
        ),
        required_signers (
          id,
          signer_custom_id,
          signing_order,
          status,
          signed_at,
          signature,
          signature_metadata
        )
      `)
      .eq('id', id)
      .single();

    if (multiSigError || !multiSigRequest) {
      return NextResponse.json(
        { error: 'Multi-signature request not found' },
        { status: 404 }
      );
    }

    // Process signers data
    const signers = (multiSigRequest.required_signers || []).map((signer: any) => ({
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
        id: multiSigRequest.documents?.[0]?.id,
        fileName: multiSigRequest.documents?.[0]?.file_name,
        fileSize: multiSigRequest.documents?.[0]?.file_size,
        fileType: multiSigRequest.documents?.[0]?.file_type,
        originalHash: multiSigRequest.documents?.[0]?.original_hash,
        signedHash: multiSigRequest.documents?.[0]?.signed_hash,
        publicUrl: multiSigRequest.documents?.[0]?.public_url,
        uploadDate: multiSigRequest.documents?.[0]?.created_at,
        metadata: multiSigRequest.documents?.[0]?.metadata
      },
      signers: signers.sort((a: any, b: any) => a.signingOrder - b.signingOrder),
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
        documentHash: multiSigRequest.documents?.[0]?.original_hash
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

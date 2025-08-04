import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';
import { generateMultiSignatureFinalPDF } from '@/lib/multi-signature-pdf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token);
    const { custom_id } = payload;

    if (!custom_id) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const multiSigId = resolvedParams.id;

    console.log('🔄 Manual PDF generation triggered for:', multiSigId);

    // Get multi-signature request details
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .select('*')
      .eq('id', multiSigId)
      .single();

    if (multiSigError || !multiSigRequest) {
      console.error('❌ Multi-signature request not found:', multiSigError);
      return NextResponse.json(
        { error: 'Multi-signature request not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized
    const { data: userSigner } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSigId)
      .eq('signer_custom_id', custom_id)
      .single();

    const isAuthorized = multiSigRequest.initiator_custom_id === custom_id || userSigner;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized to generate PDF for this request' },
        { status: 403 }
      );
    }

    // Get all signers
    const { data: allSigners, error: signersError } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSigId)
      .order('signing_order', { ascending: true });

    if (signersError || !allSigners) {
      console.error('❌ Error fetching signers:', signersError);
      return NextResponse.json(
        { error: 'Failed to fetch signers' },
        { status: 500 }
      );
    }

    // Get document details
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', multiSigRequest.document_id)
      .single();

    if (documentError || !document) {
      console.error('❌ Error fetching document:', documentError);
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 500 }
      );
    }

    console.log('📄 Document found:', document.file_name);
    console.log('👥 Signers found:', allSigners.length);
    console.log('📊 Request status:', multiSigRequest.status);

    // Check if all signers have signed
    const signedSigners = allSigners.filter(s => s.status === 'signed');
    const allSigned = signedSigners.length === allSigners.length;

    console.log(`✅ Signed: ${signedSigners.length}/${allSigners.length}`);
    console.log('🎯 All signed:', allSigned);

    if (!allSigned) {
      return NextResponse.json({
        error: 'Cannot generate final PDF - not all signers have signed',
        status: multiSigRequest.status,
        progress: {
          signed: signedSigners.length,
          total: allSigners.length,
          percentage: Math.round((signedSigners.length / allSigners.length) * 100)
        }
      }, { status: 400 });
    }

    // Generate final signed PDF
    console.log('🔄 Generating final PDF...');
    const signedPdfResult = await generateMultiSignatureFinalPDF({
      document,
      multiSigRequest,
      signers: allSigners
    });

    if (!signedPdfResult || !signedPdfResult.publicUrl) {
      throw new Error('Failed to generate signed PDF URL');
    }

    console.log('✅ PDF generated successfully:', signedPdfResult.publicUrl);

    // Update document with signed PDF URL (following single signature pattern)
    const { error: updateDocError } = await supabase
      .from('documents')
      .update({
        status: 'completed',
        signed_public_url: signedPdfResult.publicUrl,
        signed_supabase_path: signedPdfResult.filePath,
        metadata: {
          ...document.metadata,
          type: 'multi-signature',
          multi_signature_completed: true,
          completion_timestamp: new Date().toISOString(),
          total_signers: allSigners.length,
          multi_signature_request_id: multiSigRequest.id,
          manual_pdf_generation: true
        }
      })
      .eq('id', multiSigRequest.document_id);

    if (updateDocError) {
      console.error('❌ Error updating document:', updateDocError);
      return NextResponse.json(
        { error: 'Failed to update document with signed PDF URL' },
        { status: 500 }
      );
    }

    console.log('✅ Document updated with signed PDF URL');

    return NextResponse.json({
      success: true,
      message: 'Final PDF generated successfully',
      signedPdfUrl: signedPdfResult.publicUrl,
      document: {
        id: document.id,
        fileName: document.file_name,
        status: document.status
      },
      signers: allSigners.map(s => ({
        customId: s.signer_custom_id,
        order: s.signing_order,
        status: s.status,
        signedAt: s.signed_at
      }))
    });

  } catch (error) {
    console.error('❌ Error in manual PDF generation:', error);
    return NextResponse.json(
      { error: 'Internal server error during PDF generation' },
      { status: 500 }
    );
  }
}

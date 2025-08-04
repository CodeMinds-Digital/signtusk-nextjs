import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
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
    const { wallet_address, custom_id } = payload;

    if (!wallet_address || !custom_id) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const multiSigId = resolvedParams.id;
    const { private_key } = await request.json();

    if (!private_key) {
      return NextResponse.json(
        { error: 'Private key is required for signing' },
        { status: 400 }
      );
    }

    // Get multi-signature request with document
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .select(`
        *,
        documents (
          id,
          file_name,
          original_hash,
          status
        )
      `)
      .eq('id', multiSigId)
      .single();

    if (multiSigError || !multiSigRequest) {
      return NextResponse.json(
        { error: 'Multi-signature request not found' },
        { status: 404 }
      );
    }

    // Check if request is still pending
    if (multiSigRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Multi-signature request is no longer pending' },
        { status: 400 }
      );
    }

    // Get current signer
    const { data: currentSigner, error: signerError } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSigId)
      .eq('signing_order', multiSigRequest.current_signer_index)
      .eq('status', 'pending')
      .single();

    if (signerError || !currentSigner) {
      return NextResponse.json(
        { error: 'No pending signer found for current position' },
        { status: 400 }
      );
    }

    // Verify that the current user is the expected signer
    if (currentSigner.signer_custom_id !== custom_id) {
      return NextResponse.json(
        { error: 'You are not authorized to sign at this time' },
        { status: 403 }
      );
    }

    // Verify private key matches wallet address
    try {
      const wallet = new ethers.Wallet(private_key);
      if (wallet.address.toLowerCase() !== wallet_address.toLowerCase()) {
        return NextResponse.json(
          { error: 'Private key does not match wallet address' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid private key format' },
        { status: 400 }
      );
    }

    // Create signature
    const documentHash = multiSigRequest.documents.original_hash;
    const wallet = new ethers.Wallet(private_key);
    const signature = await wallet.signMessage(documentHash);

    // Update signer status
    const { error: updateSignerError } = await supabase
      .from('required_signers')
      .update({
        status: 'signed',
        signature: signature,
        signed_at: new Date().toISOString(),
        signer_address: wallet_address,
        signature_metadata: {
          document_hash: documentHash,
          signer_address: wallet_address,
          signer_custom_id: custom_id,
          signed_at: new Date().toISOString()
        }
      })
      .eq('id', currentSigner.id);

    if (updateSignerError) {
      console.error('Error updating signer status:', updateSignerError);
      return NextResponse.json(
        { error: 'Failed to update signer status' },
        { status: 500 }
      );
    }

    // Use database function to check completion and advance to next signer
    const { data: completionResult, error: completionError } = await supabase
      .rpc('complete_multi_signature_request', { request_id: multiSigId });

    let requestStatus = 'pending';
    let completedAt = null;
    let newCurrentSignerIndex = multiSigRequest.current_signer_index;
    let nextSigner = null; // Declare nextSigner in broader scope

    // Check if the request was completed by the database function
    if (!completionError && completionResult) {
      requestStatus = 'completed';
      completedAt = new Date().toISOString();
    } else {
      // Check if there are more signers to advance to
      const { data: nextSignerData, error: nextSignerError } = await supabase
        .from('required_signers')
        .select('*')
        .eq('multi_signature_request_id', multiSigId)
        .eq('signing_order', multiSigRequest.current_signer_index + 1)
        .eq('status', 'pending')
        .single();

      nextSigner = nextSignerData; // Assign to the broader scope variable

      if (nextSigner && !nextSignerError) {
        // Advance to next signer using database function
        const { error: advanceError } = await supabase
          .rpc('advance_to_next_signer', { request_id: multiSigId });

        if (!advanceError) {
          newCurrentSignerIndex = multiSigRequest.current_signer_index + 1;
        }
      } else {
        // Double-check completion manually if database function didn't work
        const { data: allSigners, error: allSignersError } = await supabase
          .from('required_signers')
          .select('status')
          .eq('multi_signature_request_id', multiSigId);

        if (!allSignersError && allSigners) {
          const allSigned = allSigners.every(signer => signer.status === 'signed');
          if (allSigned) {
            requestStatus = 'completed';
            completedAt = new Date().toISOString();
          }
        }
      }
    }

    // Update multi-signature request
    const { error: updateRequestError } = await supabase
      .from('multi_signature_requests')
      .update({
        current_signer_index: newCurrentSignerIndex,
        current_signers: multiSigRequest.current_signers + 1,
        status: requestStatus,
        completed_at: completedAt
      })
      .eq('id', multiSigId);

    if (updateRequestError) {
      console.error('Error updating multi-signature request:', updateRequestError);
      return NextResponse.json(
        { error: 'Failed to update multi-signature request' },
        { status: 500 }
      );
    }

    // If completed, update document status and generate final signed PDF
    if (requestStatus === 'completed') {
      console.log('🎉 Multi-signature document completed! Generating final PDF...');
      try {
        // Get all signers for the final PDF
        const { data: allSigners, error: signersError } = await supabase
          .from('required_signers')
          .select('*')
          .eq('multi_signature_request_id', multiSigId)
          .order('signing_order', { ascending: true });

        if (signersError) {
          console.error('Error fetching signers for final PDF:', signersError);
          throw new Error('Failed to fetch signers');
        }

        // Get document details
        const { data: document, error: documentError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', multiSigRequest.document_id)
          .single();

        if (documentError) {
          console.error('Error fetching document for final PDF:', documentError);
          throw new Error('Failed to fetch document');
        }

        if (document && allSigners) {
          console.log(`📄 Generating final PDF for document: ${document.file_name}`);
          console.log(`👥 Total signers: ${allSigners.length}`);

          // Transform signer data from snake_case to camelCase for PDF generation
          const transformedSigners = allSigners.map((signer: any) => ({
            id: signer.id,
            signerCustomId: signer.signer_custom_id,
            signingOrder: signer.signing_order,
            status: signer.status,
            signature: signer.signature,
            signedAt: signer.signed_at,
            signatureMetadata: signer.signature_metadata
          }));

          console.log('🔄 Transformed signers data:', transformedSigners.map(s => ({
            signerCustomId: s.signerCustomId,
            status: s.status,
            signingOrder: s.signingOrder,
            signedAt: s.signedAt
          })));

          // Generate final signed PDF with all signatures and QR code
          console.log('🔄 Calling generateMultiSignatureFinalPDF...');
          const signedPdfResult = await generateMultiSignatureFinalPDF({
            document,
            multiSigRequest,
            signers: transformedSigners
          });

          if (!signedPdfResult || !signedPdfResult.publicUrl) {
            throw new Error('Failed to generate signed PDF URL');
          }

          console.log('✅ Final PDF generated successfully:', signedPdfResult.publicUrl);

          // Update document with signed PDF URL (following single signature pattern)
          console.log('💾 Updating document with signed PDF URL...');

          const { error: updateDocError } = await supabase
            .from('documents')
            .update({
              status: 'completed',
              signed_hash: documentHash,
              signed_public_url: signedPdfResult.publicUrl,
              signed_supabase_path: signedPdfResult.filePath, // Use actual file path
              metadata: {
                ...document.metadata,
                type: 'multi-signature',
                multi_signature_completed: true,
                completion_timestamp: new Date().toISOString(),
                total_signers: allSigners.length,
                multi_signature_request_id: multiSigRequest.id
              }
            })
            .eq('id', multiSigRequest.document_id);

          if (updateDocError) {
            console.error('❌ Error updating document status:', updateDocError);
          } else {
            console.log('✅ Document updated successfully with signed PDF URL');
          }
        } else {
          console.error('❌ Missing document or signers data for final PDF generation');
          console.log('Document:', document ? 'Found' : 'Missing');
          console.log('Signers:', allSigners ? `Found ${allSigners.length}` : 'Missing');
        }
      } catch (pdfError) {
        console.error('❌ Error generating final signed PDF:', pdfError);
        console.error('PDF Error details:', pdfError);

        // Still update document status even if PDF generation fails
        console.log('⚠️ Updating document status without signed PDF due to error');
        const { error: updateDocError } = await supabase
          .from('documents')
          .update({
            status: 'completed',
            signed_hash: documentHash,
            metadata: {
              multi_signature_completed: true,
              completion_timestamp: new Date().toISOString(),
              pdf_generation_error: pdfError instanceof Error ? pdfError.message : String(pdfError) || 'Unknown error'
            }
          })
          .eq('id', multiSigRequest.document_id);

        if (updateDocError) {
          console.error('❌ Error updating document status after PDF error:', updateDocError);
        } else {
          console.log('✅ Document status updated despite PDF generation error');
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: requestStatus === 'completed'
        ? 'Document signing completed! All signatures collected.'
        : 'Signature recorded successfully. Waiting for next signer.',
      signature,
      status: requestStatus,
      currentSignerIndex: newCurrentSignerIndex,
      isCompleted: requestStatus === 'completed',
      nextSigner: nextSigner ? {
        customId: nextSigner.signer_custom_id,
        order: nextSigner.signing_order
      } : null
    });

  } catch (error) {
    console.error('Error processing signature:', error);
    return NextResponse.json(
      { error: 'Failed to process signature' },
      { status: 500 }
    );
  }
}

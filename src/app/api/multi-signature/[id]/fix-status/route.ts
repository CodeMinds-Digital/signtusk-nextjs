import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';

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

    // Get multi-signature request details
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .select('*')
      .eq('id', multiSigId)
      .single();

    if (multiSigError || !multiSigRequest) {
      return NextResponse.json(
        { error: 'Multi-signature request not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized (initiator or one of the signers)
    const { data: userSigner } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSigId)
      .eq('signer_custom_id', custom_id)
      .single();

    const isAuthorized = multiSigRequest.initiator_custom_id === custom_id || userSigner;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized to fix this multi-signature request' },
        { status: 403 }
      );
    }

    // Get all signers to check current status
    const { data: allSigners, error: signersError } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSigId)
      .order('signing_order', { ascending: true });

    if (signersError || !allSigners) {
      return NextResponse.json(
        { error: 'Failed to fetch signers' },
        { status: 500 }
      );
    }

    // Analyze current status
    const signedSigners = allSigners.filter(s => s.status === 'signed');
    const pendingSigners = allSigners.filter(s => s.status === 'pending');
    const totalSigners = allSigners.length;
    const allSigned = signedSigners.length === totalSigners && totalSigners > 0;

    console.log('Status Fix Analysis:', {
      multiSigId,
      currentStatus: multiSigRequest.status,
      signedSigners: signedSigners.length,
      totalSigners,
      allSigned,
      shouldBeCompleted: allSigned
    });

    let statusFixed = false;
    let newStatus = multiSigRequest.status;
    let message = 'No status change needed';

    // Fix status if all signers have signed but status is still pending
    if (allSigned && multiSigRequest.status !== 'completed') {
      console.log('Fixing status: All signers signed but status is pending');
      
      // Try using database function first
      const { data: completionResult, error: completionError } = await supabase
        .rpc('complete_multi_signature_request', { request_id: multiSigId });

      if (!completionError && completionResult) {
        statusFixed = true;
        newStatus = 'completed';
        message = 'Status fixed using database function: completed';
      } else {
        // Manual update if database function fails
        const { error: updateError } = await supabase
          .from('multi_signature_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            current_signers: totalSigners
          })
          .eq('id', multiSigId);

        if (!updateError) {
          statusFixed = true;
          newStatus = 'completed';
          message = 'Status fixed manually: completed';

          // Also update document status
          if (multiSigRequest.document_id) {
            const { error: docUpdateError } = await supabase
              .from('documents')
              .update({
                status: 'completed'
              })
              .eq('id', multiSigRequest.document_id);

            if (docUpdateError) {
              console.error('Failed to update document status:', docUpdateError);
            }
          }
        } else {
          console.error('Failed to update multi-signature request status:', updateError);
          return NextResponse.json(
            { error: 'Failed to fix status' },
            { status: 500 }
          );
        }
      }
    } else if (multiSigRequest.status === 'completed' && !allSigned) {
      // Edge case: status is completed but not all signers have signed
      message = 'Warning: Status is completed but not all signers have signed';
    } else if (allSigned && multiSigRequest.status === 'completed') {
      message = 'Status is already correct: completed';
    } else {
      message = `Status is correct: ${pendingSigners.length} signers still pending`;
    }

    return NextResponse.json({
      success: true,
      statusFixed,
      previousStatus: multiSigRequest.status,
      newStatus,
      message,
      analysis: {
        totalSigners,
        signedSigners: signedSigners.length,
        pendingSigners: pendingSigners.length,
        allSigned,
        signers: allSigners.map(s => ({
          customId: s.signer_custom_id,
          order: s.signing_order,
          status: s.status,
          signedAt: s.signed_at
        }))
      }
    });

  } catch (error) {
    console.error('Fix status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

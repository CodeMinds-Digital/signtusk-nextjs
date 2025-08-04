import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
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

    // Get multi-signature request basic info
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .select(`
        id,
        status,
        current_signer_index,
        current_signers,
        required_signers,
        initiator_custom_id,
        created_at,
        completed_at,
        description
      `)
      .eq('id', multiSigId)
      .single();

    if (multiSigError || !multiSigRequest) {
      return NextResponse.json(
        { error: 'Multi-signature request not found' },
        { status: 404 }
      );
    }

    // Get signers with minimal required info for status
    const { data: signers, error: signersError } = await supabase
      .from('required_signers')
      .select(`
        id,
        signer_custom_id,
        signing_order,
        status,
        signed_at
      `)
      .eq('multi_signature_request_id', multiSigId)
      .order('signing_order', { ascending: true });

    if (signersError) {
      console.error('Error fetching signers:', signersError);
      return NextResponse.json(
        { error: 'Failed to fetch signers' },
        { status: 500 }
      );
    }

    // Check if user is authorized to view this status
    const isInitiator = multiSigRequest.initiator_custom_id === custom_id;
    const isRequiredSigner = signers?.some(signer => signer.signer_custom_id === custom_id);

    if (!isInitiator && !isRequiredSigner) {
      return NextResponse.json(
        { error: 'Unauthorized to view this status' },
        { status: 403 }
      );
    }

    // Determine current signer
    const currentSigner = signers?.find(signer =>
      signer.signing_order === multiSigRequest.current_signer_index &&
      signer.status === 'pending'
    );

    // Calculate progress
    const totalSigners = signers?.length || 0;
    const completedSigners = signers?.filter(signer => signer.status === 'signed').length || 0;
    const progress = totalSigners > 0 ? (completedSigners / totalSigners) * 100 : 0;

    // Get next signers in queue (next 3)
    const nextSigners = signers?.filter(signer =>
      signer.signing_order > multiSigRequest.current_signer_index &&
      signer.status === 'pending'
    ).slice(0, 3);

    // Determine user's current action
    const userSigner = signers?.find(signer => signer.signer_custom_id === custom_id);
    const canSign = userSigner &&
      currentSigner?.signer_custom_id === custom_id &&
      multiSigRequest.status === 'pending';

    // Create status timeline
    const timeline = signers?.map(signer => ({
      order: signer.signing_order,
      signerCustomId: signer.signer_custom_id,
      status: signer.status,
      signedAt: signer.signed_at,
      isCurrent: signer.signing_order === multiSigRequest.current_signer_index && signer.status === 'pending'
    })) || [];

    return NextResponse.json({
      success: true,
      id: multiSigRequest.id,
      status: multiSigRequest.status,
      progress: {
        completed: completedSigners,
        total: totalSigners,
        percentage: Math.round(progress),
        current: multiSigRequest.current_signer_index + 1
      },
      currentSigner: currentSigner ? {
        customId: currentSigner.signer_custom_id,
        order: currentSigner.signing_order
      } : null,
      nextSigners: nextSigners?.map(signer => ({
        customId: signer.signer_custom_id,
        order: signer.signing_order
      })) || [],
      timeline,
      userPermissions: {
        canSign,
        isInitiator,
        isSigner: isRequiredSigner,
        userOrder: userSigner?.signing_order
      },
      timestamps: {
        createdAt: multiSigRequest.created_at,
        completedAt: multiSigRequest.completed_at
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching multi-signature status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}

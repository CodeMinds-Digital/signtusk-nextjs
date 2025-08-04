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

    // Get multi-signature request with document details
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .select(`
        *,
        documents (
          id,
          file_name,
          file_size,
          file_type,
          original_hash,
          public_url,
          status,
          metadata,
          created_at
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

    // Get required signers with their status
    const { data: signers, error: signersError } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSigId)
      .order('signing_order', { ascending: true });

    if (signersError) {
      console.error('Error fetching signers:', signersError);
      return NextResponse.json(
        { error: 'Failed to fetch signers' },
        { status: 500 }
      );
    }

    // Check if user is authorized to view this request
    const isInitiator = multiSigRequest.initiator_custom_id === custom_id;
    const isRequiredSigner = signers?.some(signer => signer.signer_custom_id === custom_id);

    if (!isInitiator && !isRequiredSigner) {
      return NextResponse.json(
        { error: 'Unauthorized to view this multi-signature request' },
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

    // Determine user's role and permissions
    const userRole = isInitiator ? 'initiator' : 'signer';
    const canSign = isRequiredSigner &&
      currentSigner?.signer_custom_id === custom_id &&
      multiSigRequest.status === 'pending';

    // Get next signers in queue
    const nextSigners = signers?.filter(signer =>
      signer.signing_order > multiSigRequest.current_signer_index &&
      signer.status === 'pending'
    ).slice(0, 3); // Show next 3 signers

    return NextResponse.json({
      success: true,
      multiSignatureRequest: multiSigRequest,
      document: multiSigRequest.documents,
      signers: signers || [],
      currentSigner,
      nextSigners: nextSigners || [],
      progress: {
        completed: completedSigners,
        total: totalSigners,
        percentage: Math.round(progress)
      },
      userPermissions: {
        role: userRole,
        canSign,
        canView: true,
        canCancel: isInitiator && multiSigRequest.status === 'pending'
      }
    });

  } catch (error) {
    console.error('Error fetching multi-signature request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch multi-signature request' },
      { status: 500 }
    );
  }
}

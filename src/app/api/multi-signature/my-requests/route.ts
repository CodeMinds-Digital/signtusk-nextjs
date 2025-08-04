import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
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

    // Get URL parameters for filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const role = url.searchParams.get('role'); // 'initiator', 'signer', or 'all'

    // Build base query for requests initiated by user
    let initiatedQuery = supabase
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
      .eq('initiator_custom_id', custom_id);

    // Apply status filter if provided
    if (status && status !== 'all') {
      initiatedQuery = initiatedQuery.eq('status', status);
    }

    // Get requests initiated by user
    const { data: initiatedRequests, error: initiatedError } = await initiatedQuery
      .order('created_at', { ascending: false });

    if (initiatedError) {
      console.error('Error fetching initiated requests:', initiatedError);
      return NextResponse.json(
        { error: 'Failed to fetch initiated requests' },
        { status: 500 }
      );
    }

    // Build query for requests where user is a signer
    let signerQuery = supabase
      .from('required_signers')
      .select(`
        *,
        multi_signature_requests (
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
        )
      `)
      .eq('signer_custom_id', custom_id);

    // Apply status filter for signer requests
    if (status && status !== 'all') {
      signerQuery = signerQuery.eq('multi_signature_requests.status', status);
    }

    // Get requests where user is a signer
    const { data: signerRequests, error: signerError } = await signerQuery
      .order('created_at', { ascending: false });

    if (signerError) {
      console.error('Error fetching signer requests:', signerError);
      return NextResponse.json(
        { error: 'Failed to fetch signer requests' },
        { status: 500 }
      );
    }

    // Process initiated requests
    const processedInitiatedRequests = await Promise.all(
      (initiatedRequests || []).map(async (request) => {
        // Get signers for this request
        const { data: signers } = await supabase
          .from('required_signers')
          .select('*')
          .eq('multi_signature_request_id', request.id)
          .order('signing_order', { ascending: true });

        const totalSigners = signers?.length || 0;
        const completedSigners = signers?.filter(s => s.status === 'signed').length || 0;
        const currentSigner = signers?.find(s =>
          s.signing_order === request.current_signer_index && s.status === 'pending'
        );

        return {
          ...request,
          role: 'initiator',
          document: request.documents, // Flatten the documents structure
          signers: signers || [],
          progress: {
            completed: completedSigners,
            total: totalSigners,
            percentage: totalSigners > 0 ? Math.round((completedSigners / totalSigners) * 100) : 0
          },
          currentSigner,
          userCanSign: false
        };
      })
    );

    // Process signer requests
    const processedSignerRequests = await Promise.all(
      (signerRequests || [])
        .filter(signerRecord => signerRecord.multi_signature_requests) // Filter out null requests
        .map(async (signerRecord) => {
          const request = signerRecord.multi_signature_requests;

          // Get all signers for this request
          const { data: allSigners } = await supabase
            .from('required_signers')
            .select('*')
            .eq('multi_signature_request_id', request.id)
            .order('signing_order', { ascending: true });

          const totalSigners = allSigners?.length || 0;
          const completedSigners = allSigners?.filter(s => s.status === 'signed').length || 0;
          const currentSigner = allSigners?.find(s =>
            s.signing_order === request.current_signer_index && s.status === 'pending'
          );

          const userCanSign = signerRecord.status === 'pending' &&
            currentSigner?.signer_custom_id === custom_id &&
            request.status === 'pending';

          return {
            ...request,
            role: 'signer',
            document: request.documents, // Flatten the documents structure
            signers: allSigners || [],
            userSignerRecord: signerRecord,
            progress: {
              completed: completedSigners,
              total: totalSigners,
              percentage: totalSigners > 0 ? Math.round((completedSigners / totalSigners) * 100) : 0
            },
            currentSigner,
            userCanSign
          };
        })
    );

    // Combine and filter results based on role parameter
    let allRequests = [];

    if (!role || role === 'all') {
      allRequests = [...processedInitiatedRequests, ...processedSignerRequests];
    } else if (role === 'initiator') {
      allRequests = processedInitiatedRequests;
    } else if (role === 'signer') {
      allRequests = processedSignerRequests;
    }

    // Sort by created_at descending
    allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Separate pending actions for quick access
    const pendingActions = allRequests.filter(request =>
      request.userCanSign || (request.role === 'initiator' && request.status === 'pending')
    );

    return NextResponse.json({
      success: true,
      requests: allRequests,
      pendingActions,
      summary: {
        total: allRequests.length,
        initiated: processedInitiatedRequests.length,
        signing: processedSignerRequests.length,
        pendingActions: pendingActions.length,
        byStatus: {
          pending: allRequests.filter(r => r.status === 'pending').length,
          completed: allRequests.filter(r => r.status === 'completed').length,
          rejected: allRequests.filter(r => r.status === 'rejected').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user multi-signature requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch multi-signature requests' },
      { status: 500 }
    );
  }
}

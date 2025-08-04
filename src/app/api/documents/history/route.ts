import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { DocumentDatabase } from '@/lib/database';
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

    // Get documents signed by this user (single signature)
    const documents = await DocumentDatabase.getDocumentsBySignerId(custom_id);

    // Get detailed information for each document including signatures and audit logs
    const detailedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const [signatures, auditLogs] = await Promise.all([
          DocumentDatabase.getDocumentSignatures(doc.id!),
          DocumentDatabase.getDocumentAuditLogs(doc.id!)
        ]);

        return {
          ...doc,
          signatures,
          auditLogs,
          signatureCount: signatures.length,
          type: 'single-signature'
        };
      })
    );

    // Get multi-signature documents where user is initiator
    const { data: initiatorRequests, error: initiatorError } = await supabase
      .from('multi_signature_requests')
      .select(`
        id,
        status,
        description,
        created_at,
        completed_at,
        initiator_custom_id,
        documents (
          id,
          file_name,
          file_size,
          file_type,
          original_hash,
          public_url,
          signed_public_url,
          status,
          created_at
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
      .eq('initiator_custom_id', custom_id)
      .order('created_at', { ascending: false });

    // Get multi-signature documents where user is a signer
    const { data: signerRequests, error: signerError } = await supabase
      .from('required_signers')
      .select(`
        multi_signature_requests (
          id,
          status,
          description,
          created_at,
          completed_at,
          initiator_custom_id,
          documents (
            id,
            file_name,
            file_size,
            file_type,
            original_hash,
            public_url,
            signed_public_url,
            status,
            created_at
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
        )
      `)
      .eq('signer_custom_id', custom_id);

    // Extract multi-signature requests from signer data
    const signerMultiSigRequests = signerRequests?.map((s: any) => s.multi_signature_requests).filter(Boolean) || [];

    // Combine both sets of requests
    const allMultiSigRequests = [
      ...(initiatorRequests || []),
      ...signerMultiSigRequests
    ];

    // Remove duplicates based on ID with proper type checking
    const uniqueMultiSigRequests = allMultiSigRequests.filter((request: any, index: number, self: any[]) =>
      request && request.id && index === self.findIndex((r: any) => r && r.id === request.id)
    );

    let multiSigDocuments: any[] = [];
    if (!initiatorError && !signerError && uniqueMultiSigRequests.length > 0) {
      multiSigDocuments = uniqueMultiSigRequests.map((request: any) => {
        const completedSigners = request.required_signers?.filter((s: any) => s.status === 'signed') || [];
        const totalSigners = request.required_signers?.length || 0;

        // Create signatures array with actual signature data
        const signatures = completedSigners.map((signer: any) => ({
          id: signer.id,
          signer_id: signer.signer_custom_id,
          signature: signer.signature,
          signed_at: signer.signed_at,
          metadata: signer.signature_metadata
        }));

        // Debug logging for multi-signature document URLs
        console.log(`Multi-sig document ${request.id}:`, {
          status: request.status,
          public_url: request.documents?.public_url,
          signed_public_url: request.documents?.signed_public_url,
          document_status: request.documents?.status
        });

        return {
          id: `ms_${request.id}`, // Use unique ID for multi-signature to prevent duplicates
          file_name: request.documents?.file_name || 'Unknown Document',
          file_size: request.documents?.file_size || 0,
          file_type: request.documents?.file_type || 'application/pdf',
          status: request.status,
          created_at: request.created_at,
          public_url: request.documents?.public_url,
          original_hash: request.documents?.original_hash,
          signed_public_url: request.status === 'completed' ? request.documents?.signed_public_url : null,
          metadata: {
            type: 'multi-signature',
            description: request.description,
            role: request.initiator_custom_id === custom_id ? 'initiator' : 'signer',
            multi_signature_request_id: request.id, // Store the actual multi-signature request ID
            document_id: request.documents?.id, // Store the actual document ID
            progress: {
              completed: completedSigners.length,
              total: totalSigners,
              percentage: totalSigners > 0 ? Math.round((completedSigners.length / totalSigners) * 100) : 0
            },
            qr_data: `MS:${request.id}`, // QR code data for multi-signature verification
            verification_url: `/multi-signature/verify/${request.id}`
          },
          signatures,
          auditLogs: signatures.map((sig: any) => ({
            id: sig.id,
            action: 'signature_added',
            actor: sig.signer_id,
            timestamp: sig.signed_at,
            details: `Document signed by ${sig.signer_id}`
          })),
          signatureCount: completedSigners.length,
          type: 'multi-signature'
        };
      });
    }

    // Get existing document IDs to prevent duplicates
    const existingDocumentIds = new Set(detailedDocuments.map(doc => doc.id));

    // Filter out multi-signature documents that are already in the regular documents list
    const uniqueMultiSigDocuments = multiSigDocuments.filter(doc => !existingDocumentIds.has(doc.id));

    // Combine both types of documents
    const allDocuments = [...detailedDocuments, ...uniqueMultiSigDocuments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      documents: allDocuments,
      total: allDocuments.length,
      singleSignature: detailedDocuments.length,
      multiSignature: multiSigDocuments.length
    });

  } catch (error) {
    console.error('Get document history error:', error);
    return NextResponse.json(
      { error: 'Failed to get document history' },
      { status: 500 }
    );
  }
}
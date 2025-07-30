import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { DocumentDatabase } from '@/lib/database';

/**
 * GET - Get document history (audit logs and signature timeline)
 * Used by dashboard components to show document activity history
 */
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

    const { id: documentId } = await params;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document from database
    const document = await DocumentDatabase.getDocument(documentId);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get signatures for this document
    const signatures = await DocumentDatabase.getDocumentSignatures(documentId);

    // Get audit logs for this document
    const auditLogs = await DocumentDatabase.getDocumentAuditLogs(documentId);

    // Create a combined timeline of events
    const timeline = [];

    // Add document creation event
    if (document.created_at) {
      timeline.push({
        id: `doc-created-${document.id}`,
        type: 'document_created',
        action: 'Document Created',
        description: `Document "${document.file_name}" was uploaded`,
        timestamp: document.created_at,
        userId: 'system',
        details: {
          fileName: document.file_name,
          fileSize: document.file_size,
          fileType: document.file_type
        }
      });
    }

    // Add signature events
    signatures.forEach(sig => {
      if (sig.signed_at) {
        timeline.push({
          id: `sig-${sig.id}`,
          type: 'signature_added',
          action: 'Document Signed',
          description: `Document signed by ${sig.signer_id}`,
          timestamp: sig.signed_at,
          userId: sig.signer_id,
          details: {
            signerId: sig.signer_id,
            signerAddress: sig.signer_address,
            signatureType: sig.signature_type,
            signature: sig.signature
          }
        });
      }
    });

    // Add audit log events
    auditLogs.forEach(log => {
      timeline.push({
        id: `audit-${log.id}`,
        type: 'audit_event',
        action: log.action,
        description: log.details || log.action,
        timestamp: log.timestamp,
        userId: log.user_id,
        details: {
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          rawDetails: log.details
        }
      });
    });

    // Sort timeline by timestamp (newest first)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Format response
    const historyResponse = {
      document: {
        id: document.id,
        fileName: document.file_name,
        status: document.status,
        createdAt: document.created_at
      },
      timeline,
      summary: {
        totalEvents: timeline.length,
        signatures: signatures.length,
        auditEntries: auditLogs.length,
        firstActivity: timeline.length > 0 ? timeline[timeline.length - 1].timestamp : null,
        lastActivity: timeline.length > 0 ? timeline[0].timestamp : null
      },
      signatures: signatures.map(sig => ({
        id: sig.id,
        signerId: sig.signer_id,
        signerAddress: sig.signer_address,
        signature: sig.signature,
        signatureType: sig.signature_type,
        timestamp: sig.signed_at,
        isValid: true // Assume valid for now
      })),
      auditLogs: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        timestamp: log.timestamp,
        userId: log.user_id,
        ipAddress: log.ip_address,
        userAgent: log.user_agent
      }))
    };

    return NextResponse.json({
      success: true,
      ...historyResponse
    });

  } catch (error) {
    console.error('Error fetching document history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document history' },
      { status: 500 }
    );
  }
}

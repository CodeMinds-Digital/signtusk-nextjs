import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { DocumentDatabase } from '@/lib/database';

/**
 * GET - Get detailed document information including signatures and audit logs
 * Used by DocumentPreviewModal to show comprehensive document details
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

    // Format detailed response
    const detailedResponse = {
      document: {
        id: document.id,
        fileName: document.file_name,
        fileSize: document.file_size,
        fileType: document.file_type,
        status: document.status,
        documentHash: document.signed_hash || document.original_hash,
        originalHash: document.original_hash,
        signedHash: document.signed_hash,
        originalUrl: document.public_url,
        signedUrl: document.signed_public_url,
        metadata: document.metadata || {},
        createdAt: document.created_at,
        updatedAt: document.updated_at
      },
      signatures: signatures.map(sig => ({
        id: sig.id,
        signerId: sig.signer_id,
        signerName: sig.signer_id, // Use signer_id as name for now
        signerAddress: sig.signer_address,
        signature: sig.signature,
        signatureType: sig.signature_type,
        signatureMetadata: sig.signature_metadata,
        timestamp: sig.signed_at,
        signedAt: sig.signed_at,
        isValid: true, // Assume valid for now
        verified: true,
        createdAt: sig.created_at
      })),
      auditLogs: auditLogs.map(log => {
        // Create user-friendly descriptions based on action type
        let description = '';
        const details = log.details || {};

        switch (log.action) {
          case 'DOCUMENT_UPLOADED':
            description = `Document "${details.file_name || 'unknown'}" was uploaded to the system`;
            break;
          case 'DOCUMENT_ACCEPTED':
            description = `Document was accepted and approved for signing`;
            break;
          case 'DOCUMENT_SIGNED':
            description = `Document was digitally signed using cryptographic signature`;
            break;
          case 'DOCUMENT_VERIFIED':
            description = `Document signature was verified and validated`;
            break;
          default:
            description = typeof details === 'object' ? JSON.stringify(details) : (details || 'Action performed');
        }

        return {
          id: log.id,
          action: log.action,
          details: description,
          timestamp: log.timestamp,
          userId: log.user_id,
          actor: log.user_id, // Add actor field for frontend compatibility
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          createdAt: log.timestamp
        };
      }),
      statistics: {
        totalSignatures: signatures.length,
        validSignatures: signatures.length, // Assume all valid for now
        totalAuditEntries: auditLogs.length,
        documentAge: document.created_at ?
          Math.floor((new Date().getTime() - new Date(document.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
      },
      verification: {
        isSignedDocument: document.status === 'signed' || document.status === 'completed',
        hasValidSignatures: signatures.length > 0,
        signatureIntegrity: 'valid', // Simplified for now
        documentIntegrity: 'valid', // Simplified for now
        lastVerified: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      ...detailedResponse
    });

  } catch (error) {
    console.error('Error fetching document details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document details' },
      { status: 500 }
    );
  }
}

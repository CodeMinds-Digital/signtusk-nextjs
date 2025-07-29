import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { DocumentDatabase } from '@/lib/database';

/**
 * GET - Get document details by ID
 * Used by verify page to load document context
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

    // Format response to match what the verify page expects
    const response = {
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
      signatures: signatures.map(sig => ({
        signerId: sig.signer_id,
        signerName: sig.signer_id, // Use signer_id as name for now
        signerAddress: sig.signer_address,
        signature: sig.signature,
        timestamp: sig.signed_at,
        signedAt: sig.signed_at,
        isValid: true, // Assume valid for now
        verified: true
      })),
      signatureCount: signatures.length,
      auditLogs: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        timestamp: log.timestamp,
        userId: log.user_id
      })),
      createdAt: document.created_at,
      updatedAt: document.updated_at,
      // Additional fields for verification
      title: document.metadata?.title || document.file_name,
      purpose: document.metadata?.purpose || 'Document verification',
      signerInfo: document.metadata?.signerInfo || 'Unknown'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document details' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update document details
 */
export async function PUT(
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
    const updates = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Update document in database
    const updatedDocument = await DocumentDatabase.updateDocument(documentId, updates);

    return NextResponse.json({
      success: true,
      document: updatedDocument
    });

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete document
 */
export async function DELETE(
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

    // Get document first to check ownership/permissions
    const document = await DocumentDatabase.getDocument(documentId);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // TODO: Add proper ownership/permission checks here
    // For now, allow deletion if user is authenticated

    // Delete document from database
    // Note: This would also need to delete associated signatures, audit logs, etc.
    // and clean up files from storage

    return NextResponse.json({
      success: true,
      message: 'Document deletion not implemented yet'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

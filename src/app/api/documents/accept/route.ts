import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { DocumentDatabase, AuditLogger } from '@/lib/database';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const { document_id, action } = await request.json();

    if (!document_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: document_id, action' },
        { status: 400 }
      );
    }

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    // Get document to verify ownership/access
    const document = await DocumentDatabase.getDocument(document_id);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Update document status based on action
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const updatedDocument = await DocumentDatabase.updateDocument(document_id, {
      status: newStatus
    });

    // Log the action
    if (action === 'accept') {
      await AuditLogger.logDocumentAccepted(
        document_id,
        custom_id,
        {
          previous_status: document.status,
          new_status: newStatus,
          file_name: document.file_name
        },
        request
      );
    } else {
      await AuditLogger.logSignatureRejected(
        document_id,
        custom_id,
        {
          previous_status: document.status,
          new_status: newStatus,
          file_name: document.file_name,
          reason: 'Document rejected during preview'
        },
        request
      );
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      message: `Document ${action}ed successfully`
    });

  } catch (error) {
    console.error('Document accept/reject error:', error);
    return NextResponse.json(
      { error: 'Document action failed' },
      { status: 500 }
    );
  }
}
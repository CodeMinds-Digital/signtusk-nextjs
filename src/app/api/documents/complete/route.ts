import { NextRequest, NextResponse } from 'next/server';
import { DocumentDatabase, AuditLogger } from '@/lib/database';

/**
 * Node.js API endpoint to mark documents as completed
 * Called after document signing is finished to update status from 'signed' to 'completed'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, signedPath, signedHash, completedBy, completedAt } = body;

    // Validate required fields
    if (!documentId || !signedPath || !signedHash || !completedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, signedPath, signedHash, completedBy' },
        { status: 400 }
      );
    }

    // Get current document to verify it exists and is in 'signed' status
    const currentDocument = await DocumentDatabase.getDocument(documentId);
    
    if (!currentDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (currentDocument.status !== 'signed') {
      return NextResponse.json(
        { error: `Document status is '${currentDocument.status}', expected 'signed'` },
        { status: 400 }
      );
    }

    // Update document status to 'completed'
    const updatedDocument = await DocumentDatabase.updateDocument(documentId, {
      status: 'completed',
      metadata: {
        ...currentDocument.metadata,
        completed_by: completedBy,
        completed_at: completedAt || new Date().toISOString(),
        completion_service: 'nodejs_api',
        signed_path: signedPath,
        signed_hash: signedHash
      }
    });

    // Create audit log for completion
    await AuditLogger.logDocumentSigned(
      documentId,
      completedBy,
      {
        action: 'document_completed',
        completion_service: 'nodejs_api',
        signed_path: signedPath,
        signed_hash: signedHash,
        completed_at: completedAt || new Date().toISOString(),
        previous_status: 'signed',
        new_status: 'completed'
      },
      request
    );

    // Log successful completion
    console.log(`Document ${documentId} marked as completed by Node.js service`);

    return NextResponse.json({
      success: true,
      message: 'Document marked as completed successfully',
      document: {
        id: documentId,
        status: 'completed',
        completed_at: completedAt || new Date().toISOString(),
        completed_by: completedBy
      }
    });

  } catch (error) {
    console.error('Error marking document as completed:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check completion status of a document
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing documentId parameter' },
        { status: 400 }
      );
    }

    const document = await DocumentDatabase.getDocument(documentId);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      documentId: document.id,
      status: document.status,
      completed: document.status === 'completed',
      metadata: document.metadata
    });

  } catch (error) {
    console.error('Error checking document completion status:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
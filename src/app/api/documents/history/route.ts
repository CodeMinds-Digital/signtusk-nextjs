import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { DocumentDatabase } from '@/lib/database';

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

    // Get documents signed by this user
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
          signatureCount: signatures.length
        };
      })
    );

    return NextResponse.json({
      success: true,
      documents: detailedDocuments,
      total: detailedDocuments.length
    });

  } catch (error) {
    console.error('Get document history error:', error);
    return NextResponse.json(
      { error: 'Failed to get document history' },
      { status: 500 }
    );
  }
}
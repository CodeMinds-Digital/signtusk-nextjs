import { NextRequest, NextResponse } from 'next/server';
import { verifyDocument } from '@/lib/pdf-verification';
import { DocumentDatabase, AuditLogger } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const providedSignature = formData.get('signature') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
        { status: 400 }
      );
    }

    // Use the new verification system
    console.log('🔍 Starting document verification for file:', file.name);
    const verificationResult = await verifyDocument(file, providedSignature || undefined);
    console.log('📄 Verification result:', {
      isValid: verificationResult.isValid,
      isSignedPDF: verificationResult.isSignedPDF,
      isMultiSignature: verificationResult.isMultiSignature,
      multiSignatureRequestId: verificationResult.multiSignatureRequestId,
      error: verificationResult.error
    });

    // Handle multi-signature documents
    if (verificationResult.isMultiSignature && verificationResult.multiSignatureRequestId) {
      console.log('✅ Detected multi-signature document, redirecting to:', `/multi-signature/verify/${verificationResult.multiSignatureRequestId}`);
      return NextResponse.json({
        success: true,
        verification: {
          isValid: true,
          isMultiSignature: true,
          multiSignatureRequestId: verificationResult.multiSignatureRequestId,
          redirectUrl: `/multi-signature/verify/${verificationResult.multiSignatureRequestId}`,
          message: 'This is a multi-signature document. Redirecting to multi-signature verification...'
        }
      });
    }

    // Get document metadata if available
    let documentMetadata = null;
    if (verificationResult.isValid && (verificationResult.originalHash || verificationResult.signedHash)) {
      try {
        const { supabase } = await import('@/lib/database');
        const hashToLookup = verificationResult.originalHash || verificationResult.signedHash;

        const { data: documents } = await supabase
          .from('documents')
          .select('metadata')
          .or(`original_hash.eq.${hashToLookup},signed_hash.eq.${hashToLookup}`)
          .limit(1);

        if (documents && documents.length > 0) {
          documentMetadata = documents[0].metadata;
        }
      } catch (error) {
        console.warn('Could not fetch document metadata:', error);
      }
    }

    // Transform result to match expected format
    const transformedResult = {
      isValid: verificationResult.isValid,
      documentHash: verificationResult.signedHash || verificationResult.originalHash,
      fileName: verificationResult.documentInfo.fileName,
      fileSize: verificationResult.documentInfo.fileSize,
      details: {
        fileName: verificationResult.documentInfo.fileName,
        documentHash: verificationResult.signedHash || verificationResult.originalHash,
        fileSize: verificationResult.documentInfo.fileSize,
        isSignedPDF: verificationResult.isSignedPDF || (verificationResult.signedHash !== verificationResult.originalHash),
        originalHash: verificationResult.originalHash,
        signedHash: verificationResult.signedHash,
        signatures: verificationResult.signatures,
        pageCount: verificationResult.documentInfo.pageCount,
        verification_method: verificationResult.isSignedPDF ? 'signed_pdf_verification' : 'original_document_verification',
        total_signatures: verificationResult.signatures.length,
        valid_signatures: verificationResult.signatures.filter(sig => sig.isValid).length,
        signerId: verificationResult.signatures.length > 0 ? verificationResult.signatures[0].signerId : undefined,
        timestamp: verificationResult.signatures.length > 0 ? verificationResult.signatures[0].timestamp : undefined,
        metadata: documentMetadata
      },
      error: verificationResult.error || null
    };

    // Try to record verification attempt if we can find a document ID
    try {
      if (verificationResult.signatures.length > 0) {
        // Try to find document in database for logging
        const { supabase } = await import('@/lib/database');

        // Look up by original hash if available
        const hashToLookup = verificationResult.originalHash || verificationResult.signedHash;

        if (hashToLookup) {
          const { data: documents } = await supabase
            .from('documents')
            .select('id')
            .or(`original_hash.eq.${hashToLookup},signed_hash.eq.${hashToLookup}`)
            .limit(1);

          if (documents && documents.length > 0) {
            const documentId = documents[0].id;

            await DocumentDatabase.recordVerificationAttempt({
              document_id: documentId,
              verifier_ip: getClientIP(request),
              verification_result: verificationResult.isValid,
              verification_details: {
                file_name: file.name,
                file_size: file.size,
                document_hash: hashToLookup,
                verification_method: transformedResult.details.verification_method,
                is_signed_pdf: verificationResult.isSignedPDF
              }
            });

            await AuditLogger.logDocumentVerification(
              documentId,
              'anonymous',
              {
                verification_result: verificationResult.isValid,
                document_hash: hashToLookup,
                file_name: file.name,
                is_signed_pdf: verificationResult.isSignedPDF
              },
              request
            );
          }
        }
      }
    } catch (loggingError) {
      console.warn('Could not log verification attempt:', loggingError);
      // Don't fail the verification if logging fails
    }

    return NextResponse.json({
      success: true,
      verification: transformedResult
    });

  } catch (error) {
    console.error('Document verification error:', error);
    return NextResponse.json(
      {
        error: 'Document verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getClientIP(request: NextRequest): string | undefined {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || clientIP || undefined;
}
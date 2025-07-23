import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { signDocument } from '@/lib/signing';
import { generateDocumentHashServer } from '@/lib/document-server';
import { uploadBlobAsAdmin, downloadFileAsAdmin } from '@/lib/supabase-admin';
import { DocumentDatabase, AuditLogger } from '@/lib/database';
import { generateSignedPDF, SignatureData } from '@/lib/pdf-signature';

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
    const { wallet_address, custom_id } = payload;

    if (!wallet_address || !custom_id) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Parse request body
    const { document_id, private_key } = await request.json();

    if (!document_id || !private_key) {
      return NextResponse.json(
        { error: 'Missing required fields: document_id, private_key' },
        { status: 400 }
      );
    }

    // Get document to verify it's in accepted status
    const document = await DocumentDatabase.getDocument(document_id);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Document must be accepted before signing' },
        { status: 400 }
      );
    }

    // Step 1: Sign the document hash
    const signature = await signDocument(document.original_hash, private_key);

    // Step 2: Create signature record
    const signatureRecord = await DocumentDatabase.createSignature({
      document_id: document_id,
      signer_id: custom_id,
      signer_address: wallet_address,
      signature: signature,
      signature_type: 'single',
      signature_metadata: {
        algorithm: 'ECDSA',
        hash_algorithm: 'SHA-256'
      }
    });

    // Step 3: Download original file from Supabase to create signed PDF using admin client
    const downloadResult = await downloadFileAsAdmin('documents', document.supabase_path);
    
    if (downloadResult.error || !downloadResult.data) {
      return NextResponse.json(
        { error: 'Failed to download original document for signing' },
        { status: 500 }
      );
    }

    // Step 4: Create File object from downloaded blob
    const originalFile = new File([downloadResult.data], document.file_name, { 
      type: document.file_type 
    });

    // Step 5: Generate signed PDF with embedded signature
    const signatureData: SignatureData = {
      id: signatureRecord.id!,
      signerName: custom_id,
      signerId: custom_id,
      signature: signature,
      timestamp: new Date().toISOString()
    };

    const signedPdfBlob = await generateSignedPDF(originalFile, document.original_hash, [signatureData]);

    // Step 6: Upload signed PDF to Supabase Storage using admin client
    const signedUploadPath = `documents/${custom_id}/${Date.now()}_signed_${document.file_name}`;
    const signedUploadResult = await uploadBlobAsAdmin(
      signedPdfBlob,
      'documents',
      signedUploadPath,
      'application/pdf'
    );

    if (signedUploadResult.error) {
      console.error('Signed PDF upload error:', signedUploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload signed document' },
        { status: 500 }
      );
    }

    // Step 7: Generate hash of signed PDF using server-side function
    const signedPdfFile = new File([signedPdfBlob], `signed_${document.file_name}`, { 
      type: 'application/pdf' 
    });
    const signedHash = await generateDocumentHashServer(signedPdfFile);

    // Step 8: Update document record with signed information
    const updatedDocument = await DocumentDatabase.updateDocument(document_id, {
      signed_hash: signedHash,
      signed_supabase_path: signedUploadPath,
      signed_public_url: signedUploadResult.publicUrl,
      status: 'signed'
    });

    // Step 9: Log document signing
    await AuditLogger.logDocumentSigned(
      document_id,
      custom_id,
      {
        signature: signature,
        signed_hash: signedHash,
        signed_upload_path: signedUploadPath,
        signature_algorithm: 'ECDSA',
        original_hash: document.original_hash
      },
      request
    );

    // Step 10: Mark as completed
    await DocumentDatabase.updateDocument(document_id, {
      status: 'completed'
    });

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      signature: signatureRecord,
      message: 'Document signed successfully',
      download_urls: {
        original: document.public_url,
        signed: signedUploadResult.publicUrl
      }
    });

  } catch (error) {
    console.error('Document signing error:', error);
    return NextResponse.json(
      { error: 'Document signing failed' },
      { status: 500 }
    );
  }
}
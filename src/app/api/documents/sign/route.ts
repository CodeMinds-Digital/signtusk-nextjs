import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { generateDocumentHash } from '@/lib/document';
import { signDocument } from '@/lib/signing';
import { uploadFileToSupabase, uploadBlobToSupabase } from '@/lib/supabase-storage';
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const privateKey = formData.get('privateKey') as string;
    const metadata = formData.get('metadata') as string;

    if (!file || !privateKey) {
      return NextResponse.json(
        { error: 'Missing required fields: file, privateKey' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Parse metadata if provided
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (_error) {
        return NextResponse.json(
          { error: 'Invalid metadata format' },
          { status: 400 }
        );
      }
    }

    // Step 1: Upload original document to Supabase Storage
    const originalUploadPath = `documents/${custom_id}/${Date.now()}_original_${file.name}`;
    const originalUploadResult = await uploadFileToSupabase(file, 'documents', originalUploadPath);

    if (originalUploadResult.error) {
      console.error('Original upload error:', originalUploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload original document' },
        { status: 500 }
      );
    }

    // Step 2: Generate document hash
    const originalHash = await generateDocumentHash(file);

    // Step 3: Create document record in database
    const documentRecord = await DocumentDatabase.createDocument({
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      original_hash: originalHash,
      supabase_path: originalUploadPath,
      public_url: originalUploadResult.publicUrl,
      status: 'uploaded',
      metadata: parsedMetadata
    });

    // Step 4: Log document upload
    await AuditLogger.logDocumentUpload(
      documentRecord.id!,
      custom_id,
      {
        file_name: file.name,
        file_size: file.size,
        original_hash: originalHash,
        upload_path: originalUploadPath
      },
      request
    );

    // Step 5: Sign the document hash
    const signature = await signDocument(originalHash, privateKey);

    // Step 6: Create signature record
    const signatureRecord = await DocumentDatabase.createSignature({
      document_id: documentRecord.id!,
      signer_id: custom_id,
      signer_address: wallet_address,
      signature: signature,
      signature_type: 'single',
      signature_metadata: {
        algorithm: 'ECDSA',
        hash_algorithm: 'SHA-256'
      }
    });

    // Step 7: Generate signed PDF with embedded signature
    const signatureData: SignatureData = {
      id: signatureRecord.id!,
      signerName: custom_id,
      signerId: custom_id,
      signature: signature,
      timestamp: new Date().toISOString()
    };

    const signedPdfBlob = await generateSignedPDF(file, originalHash, [signatureData]);

    // Step 8: Upload signed PDF to Supabase Storage
    const signedUploadPath = `documents/${custom_id}/${Date.now()}_signed_${file.name}`;
    const signedUploadResult = await uploadBlobToSupabase(
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

    // Step 9: Generate hash of signed PDF
    const signedPdfFile = new File([signedPdfBlob], `signed_${file.name}`, { type: 'application/pdf' });
    const signedHash = await generateDocumentHash(signedPdfFile);

    // Step 10: Update document record with signed information
    const updatedDocument = await DocumentDatabase.updateDocument(documentRecord.id!, {
      signed_hash: signedHash,
      signed_supabase_path: signedUploadPath,
      signed_public_url: signedUploadResult.publicUrl,
      status: 'signed'
    });

    // Step 11: Log document signing
    await AuditLogger.logDocumentSigned(
      documentRecord.id!,
      custom_id,
      {
        signature: signature,
        signed_hash: signedHash,
        signed_upload_path: signedUploadPath,
        signature_algorithm: 'ECDSA'
      },
      request
    );

    // Step 12: Mark as completed
    await DocumentDatabase.updateDocument(documentRecord.id!, {
      status: 'completed'
    });

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      signature: signatureRecord,
      message: 'Document signed successfully',
      download_urls: {
        original: originalUploadResult.publicUrl,
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
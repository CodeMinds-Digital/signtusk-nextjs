import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { generateDocumentHashServer } from '@/lib/document-server';
import { uploadFileAsAdmin } from '@/lib/supabase-admin';
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
    const metadata = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
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
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid metadata format' },
          { status: 400 }
        );
      }
    }

    // Step 1: Upload original document to Supabase Storage using admin client
    const originalUploadPath = `documents/${custom_id}/${Date.now()}_original_${file.name}`;
    const originalUploadResult = await uploadFileAsAdmin(file, 'documents', originalUploadPath);

    if (originalUploadResult.error) {
      console.error('Original upload error:', originalUploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload original document' },
        { status: 500 }
      );
    }

    // Step 2: Generate document hash using server-side function
    const originalHash = await generateDocumentHashServer(file);

    // Step 3: Create document record in database with 'uploaded' status
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

    return NextResponse.json({
      success: true,
      document: documentRecord,
      preview_url: originalUploadResult.publicUrl,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Document upload failed' },
      { status: 500 }
    );
  }
}
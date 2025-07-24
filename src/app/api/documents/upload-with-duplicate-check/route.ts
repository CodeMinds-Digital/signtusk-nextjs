import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { generateDocumentHashServer } from '@/lib/document-server';
import { uploadFileAsAdmin } from '@/lib/supabase-admin';
import { DocumentDatabase, AuditLogger } from '@/lib/database';
import { checkForDuplicateDocument, formatDuplicateMessage } from '@/lib/duplicate-document-checker';

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
    const forceUpload = formData.get('forceUpload') === 'true'; // Allow override for confirmed uploads

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
      } catch (_error) {
        return NextResponse.json(
          { error: 'Invalid metadata format' },
          { status: 400 }
        );
      }
    }

    // Step 1: Generate document hash first to check for duplicates
    const originalHash = await generateDocumentHashServer(file);

    // Step 2: Check for duplicate documents
    if (!forceUpload) {
      const duplicateCheck = await checkForDuplicateDocument(originalHash, custom_id);

      if (duplicateCheck.isDuplicate && !duplicateCheck.canProceed) {
        // Block upload - document already exists and is completed
        return NextResponse.json({
          success: false,
          error: 'duplicate_document',
          message: formatDuplicateMessage(duplicateCheck),
          duplicate_info: {
            action: duplicateCheck.action,
            existing_document: duplicateCheck.existingDocument,
            can_proceed: duplicateCheck.canProceed
          }
        }, { status: 409 }); // 409 Conflict
      }

      if (duplicateCheck.isDuplicate && duplicateCheck.action === 'confirm') {
        // Ask for user confirmation
        return NextResponse.json({
          success: false,
          error: 'duplicate_confirmation_required',
          message: formatDuplicateMessage(duplicateCheck),
          duplicate_info: {
            action: duplicateCheck.action,
            existing_document: duplicateCheck.existingDocument,
            can_proceed: duplicateCheck.canProceed
          }
        }, { status: 409 }); // 409 Conflict
      }
    }

    // Step 3: Upload original document to Supabase Storage using admin client
    const originalUploadPath = `documents/${custom_id}/${Date.now()}_original_${file.name}`;
    const originalUploadResult = await uploadFileAsAdmin(file, 'documents', originalUploadPath);

    if (originalUploadResult.error) {
      console.error('Original upload error:', originalUploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload original document' },
        { status: 500 }
      );
    }

    // Step 4: Create document record in database with 'uploaded' status
    const documentRecord = await DocumentDatabase.createDocument({
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      original_hash: originalHash,
      supabase_path: originalUploadPath,
      public_url: originalUploadResult.publicUrl,
      status: 'uploaded',
      metadata: {
        ...parsedMetadata,
        force_upload: forceUpload,
        uploader_id: custom_id
      }
    });

    // Step 5: Log document upload
    await AuditLogger.logDocumentUpload(
      documentRecord.id!,
      custom_id,
      {
        file_name: file.name,
        file_size: file.size,
        original_hash: originalHash,
        upload_path: originalUploadPath,
        force_upload: forceUpload
      },
      request
    );

    return NextResponse.json({
      success: true,
      document: documentRecord,
      preview_url: originalUploadResult.publicUrl,
      message: forceUpload
        ? 'Document uploaded successfully (duplicate confirmed)'
        : 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Document upload failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check for duplicates without uploading
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentHash = searchParams.get('hash');
    const userId = searchParams.get('userId');

    if (!documentHash) {
      return NextResponse.json(
        { error: 'Document hash is required' },
        { status: 400 }
      );
    }

    const duplicateCheck = await checkForDuplicateDocument(documentHash, userId || undefined);

    return NextResponse.json({
      success: true,
      duplicate_check: duplicateCheck,
      message: formatDuplicateMessage(duplicateCheck)
    });

  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
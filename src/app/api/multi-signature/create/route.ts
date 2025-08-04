import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { generateDocumentHashServer } from '@/lib/document-server';
import { uploadFileAsAdmin } from '@/lib/supabase-admin';
import { DocumentDatabase, AuditLogger } from '@/lib/database';
import { checkForDuplicateDocument, formatDuplicateMessage } from '@/lib/duplicate-document-checker';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SignerRequest {
  customId: string;
  order: number;
}

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
    const signersData = formData.get('signers') as string;
    const description = formData.get('description') as string || '';
    const forceUpload = formData.get('forceUpload') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
        { status: 400 }
      );
    }

    if (!signersData) {
      return NextResponse.json(
        { error: 'Missing required field: signers' },
        { status: 400 }
      );
    }

    // Parse signers data
    let signers: SignerRequest[];
    try {
      signers = JSON.parse(signersData);
      if (!Array.isArray(signers) || signers.length === 0) {
        throw new Error('Signers must be a non-empty array');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid signers format' },
        { status: 400 }
      );
    }

    // Validate signers
    for (const signer of signers) {
      if (!signer.customId || typeof signer.order !== 'number') {
        return NextResponse.json(
          { error: 'Each signer must have customId and order' },
          { status: 400 }
        );
      }
    }

    // Sort signers by order to ensure correct sequence
    signers.sort((a, b) => a.order - b.order);

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Generate document hash
    const originalHash = await generateDocumentHashServer(file);

    // Check for duplicate documents
    const duplicateCheck = await checkForDuplicateDocument(originalHash, custom_id);

    if (duplicateCheck.isDuplicate && !duplicateCheck.canProceed) {
      return NextResponse.json({
        success: false,
        error: 'duplicate_document',
        message: formatDuplicateMessage(duplicateCheck),
        duplicate_info: {
          action: duplicateCheck.action,
          existing_document: duplicateCheck.existingDocument,
          can_proceed: duplicateCheck.canProceed
        }
      }, { status: 409 });
    }

    if (!forceUpload && duplicateCheck.isDuplicate && duplicateCheck.action === 'confirm') {
      return NextResponse.json({
        success: false,
        error: 'duplicate_confirmation_required',
        message: formatDuplicateMessage(duplicateCheck),
        duplicate_info: {
          action: duplicateCheck.action,
          existing_document: duplicateCheck.existingDocument,
          can_proceed: duplicateCheck.canProceed
        }
      }, { status: 409 });
    }

    // Upload document to Supabase Storage
    const uploadPath = `multi-signature/${custom_id}/${Date.now()}_${file.name}`;
    const uploadResult = await uploadFileAsAdmin(file, 'documents', uploadPath);

    if (uploadResult.error) {
      console.error('Upload error:', uploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload document' },
        { status: 500 }
      );
    }

    // Start database transaction
    const { data: documentRecord, error: docError } = await supabase
      .from('documents')
      .insert({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        original_hash: originalHash,
        supabase_path: uploadPath,
        public_url: uploadResult.publicUrl,
        status: 'uploaded',
        metadata: { description, type: 'multi-signature' },
        uploader_custom_id: custom_id,
        uploader_wallet_address: wallet_address
      })
      .select()
      .single();

    if (docError || !documentRecord) {
      console.error('Document creation error:', docError);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // Create multi-signature request
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .insert({
        document_id: documentRecord.id,
        initiator_id: custom_id,
        initiator_address: wallet_address,
        initiator_custom_id: custom_id,
        required_signers: signers.length,
        current_signers: 0,
        current_signer_index: 0,
        description: description,
        signing_type: 'sequential',
        status: 'pending'
      })
      .select()
      .single();

    if (multiSigError || !multiSigRequest) {
      console.error('Multi-signature request creation error:', multiSigError);
      return NextResponse.json(
        { error: 'Failed to create multi-signature request' },
        { status: 500 }
      );
    }

    // Create required signers records
    const requiredSignersData = signers.map((signer, index) => ({
      multi_signature_request_id: multiSigRequest.id,
      signer_id: signer.customId,
      signer_custom_id: signer.customId,
      signing_order: index,
      status: 'pending'
    }));

    const { error: signersError } = await supabase
      .from('required_signers')
      .insert(requiredSignersData);

    if (signersError) {
      console.error('Required signers creation error:', signersError);
      return NextResponse.json(
        { error: 'Failed to create required signers' },
        { status: 500 }
      );
    }

    // Log the multi-signature request creation
    await AuditLogger.logDocumentUpload(
      documentRecord.id,
      custom_id,
      {
        file_name: file.name,
        file_size: file.size,
        original_hash: originalHash,
        upload_path: uploadPath,
        type: 'multi-signature',
        signers_count: signers.length,
        description: description
      },
      request
    );

    return NextResponse.json({
      success: true,
      document: documentRecord,
      multiSignatureRequest: multiSigRequest,
      signers: requiredSignersData,
      preview_url: uploadResult.publicUrl,
      message: 'Multi-signature request created successfully'
    });

  } catch (error) {
    console.error('Multi-signature creation error:', error);
    return NextResponse.json(
      { error: 'Multi-signature request creation failed' },
      { status: 500 }
    );
  }
}

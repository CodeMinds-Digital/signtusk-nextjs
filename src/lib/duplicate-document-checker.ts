import { supabase } from '@/lib/database';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingDocument?: {
    id: string;
    file_name: string;
    status: string;
    created_at: string;
    signed_at?: string;
    signer_id?: string;
    public_url?: string;
    signed_public_url?: string;
  };
  canProceed: boolean;
  message: string;
  action: 'allow' | 'block' | 'confirm';
}

/**
 * Check if a document with the same hash already exists
 * @param documentHash - The hash of the document to check
 * @param currentUserId - The current user's custom_id
 * @returns Duplicate check result with recommendations
 */
export async function checkForDuplicateDocument(
  documentHash: string,
  currentUserId?: string
): Promise<DuplicateCheckResult> {
  try {
    // Query for existing documents with the same hash
    const { data: existingDocuments, error } = await supabase
      .from('documents')
      .select(`
        id,
        file_name,
        status,
        created_at,
        public_url,
        signed_public_url,
        document_signatures (
          signer_id,
          signed_at,
          created_at
        )
      `)
      .eq('original_hash', documentHash)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking for duplicate documents:', error);
      return {
        isDuplicate: false,
        canProceed: true,
        message: 'Unable to check for duplicates. Proceeding with upload.',
        action: 'allow'
      };
    }

    if (!existingDocuments || existingDocuments.length === 0) {
      // No duplicates found - safe to proceed
      return {
        isDuplicate: false,
        canProceed: true,
        message: 'Document is unique. Ready to upload.',
        action: 'allow'
      };
    }

    // Found existing document(s) with same hash
    const mostRecentDocument = existingDocuments[0];
    const signatures = mostRecentDocument.document_signatures || [];
    
    // Determine the most recent signature info
    const latestSignature = signatures.length > 0 
      ? signatures.sort((a, b) => new Date(b.signed_at || b.created_at).getTime() - new Date(a.signed_at || a.created_at).getTime())[0]
      : null;

    const existingDocumentInfo = {
      id: mostRecentDocument.id,
      file_name: mostRecentDocument.file_name,
      status: mostRecentDocument.status,
      created_at: mostRecentDocument.created_at,
      signed_at: latestSignature?.signed_at || latestSignature?.created_at,
      signer_id: latestSignature?.signer_id,
      public_url: mostRecentDocument.public_url,
      signed_public_url: mostRecentDocument.signed_public_url
    };

    // Check document status and determine action
    switch (mostRecentDocument.status) {
      case 'completed':
        return {
          isDuplicate: true,
          existingDocument: existingDocumentInfo,
          canProceed: false,
          message: `This document has already been signed and completed${latestSignature?.signer_id ? ` by ${latestSignature.signer_id}` : ''}. Please upload a new document instead.`,
          action: 'block'
        };

      case 'signed':
        return {
          isDuplicate: true,
          existingDocument: existingDocumentInfo,
          canProceed: false,
          message: `This document has already been signed${latestSignature?.signer_id ? ` by ${latestSignature.signer_id}` : ''}. Please upload a new document instead.`,
          action: 'block'
        };

      case 'accepted':
        // Check if current user is the one who accepted it
        if (currentUserId && latestSignature?.signer_id === currentUserId) {
          return {
            isDuplicate: true,
            existingDocument: existingDocumentInfo,
            canProceed: false,
            message: 'You have already accepted this document for signing. Please complete the signing process or upload a new document.',
            action: 'block'
          };
        } else {
          return {
            isDuplicate: true,
            existingDocument: existingDocumentInfo,
            canProceed: false,
            message: `This document has already been accepted for signing${latestSignature?.signer_id ? ` by ${latestSignature.signer_id}` : ''}. Please upload a new document instead.`,
            action: 'block'
          };
        }

      case 'uploaded':
        // Check if current user uploaded it
        if (currentUserId) {
          // Check if current user has any relationship to this document
          const userSignatures = signatures.filter(sig => sig.signer_id === currentUserId);
          
          if (userSignatures.length > 0) {
            return {
              isDuplicate: true,
              existingDocument: existingDocumentInfo,
              canProceed: false,
              message: 'You have already uploaded this document. Please complete the existing workflow or upload a new document.',
              action: 'block'
            };
          } else {
            return {
              isDuplicate: true,
              existingDocument: existingDocumentInfo,
              canProceed: true,
              message: 'This document exists but you can proceed with a new signing workflow. Do you want to continue?',
              action: 'confirm'
            };
          }
        } else {
          return {
            isDuplicate: true,
            existingDocument: existingDocumentInfo,
            canProceed: true,
            message: 'This document has been uploaded before. Do you want to create a new signing workflow?',
            action: 'confirm'
          };
        }

      case 'rejected':
        return {
          isDuplicate: true,
          existingDocument: existingDocumentInfo,
          canProceed: true,
          message: 'This document was previously rejected. You can upload it again for a new signing workflow.',
          action: 'confirm'
        };

      default:
        return {
          isDuplicate: true,
          existingDocument: existingDocumentInfo,
          canProceed: true,
          message: 'This document exists in the system. Do you want to proceed with a new workflow?',
          action: 'confirm'
        };
    }

  } catch (error) {
    console.error('Error in duplicate document check:', error);
    return {
      isDuplicate: false,
      canProceed: true,
      message: 'Unable to verify document uniqueness. Proceeding with upload.',
      action: 'allow'
    };
  }
}

/**
 * Get detailed information about existing documents with the same hash
 * @param documentHash - The hash to search for
 * @returns Array of existing documents with full details
 */
export async function getExistingDocumentsByHash(documentHash: string) {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_signatures (
          *
        )
      `)
      .eq('original_hash', documentHash)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching existing documents:', error);
      return [];
    }

    return documents || [];
  } catch (error) {
    console.error('Error in getExistingDocumentsByHash:', error);
    return [];
  }
}

/**
 * Check if user can upload a document (considering their existing documents)
 * @param documentHash - The hash of the document
 * @param userId - The user's custom_id
 * @returns Whether the user can upload this document
 */
export async function canUserUploadDocument(
  documentHash: string,
  userId: string
): Promise<{
  canUpload: boolean;
  reason: string;
  existingDocuments: any[];
}> {
  try {
    const existingDocuments = await getExistingDocumentsByHash(documentHash);
    
    if (existingDocuments.length === 0) {
      return {
        canUpload: true,
        reason: 'Document is unique',
        existingDocuments: []
      };
    }

    // Check if user has any incomplete workflows for this document
    const userDocuments = existingDocuments.filter(doc => {
      const signatures = doc.document_signatures || [];
      return signatures.some((sig: any) => sig.signer_id === userId);
    });

    const incompleteUserDocuments = userDocuments.filter(doc => 
      !['completed', 'signed'].includes(doc.status)
    );

    if (incompleteUserDocuments.length > 0) {
      return {
        canUpload: false,
        reason: 'You have incomplete workflows for this document',
        existingDocuments: incompleteUserDocuments
      };
    }

    const completedDocuments = existingDocuments.filter(doc => 
      ['completed', 'signed'].includes(doc.status)
    );

    if (completedDocuments.length > 0) {
      return {
        canUpload: false,
        reason: 'This document has already been completed',
        existingDocuments: completedDocuments
      };
    }

    return {
      canUpload: true,
      reason: 'Can create new workflow for this document',
      existingDocuments
    };

  } catch (error) {
    console.error('Error in canUserUploadDocument:', error);
    return {
      canUpload: true,
      reason: 'Unable to check existing documents',
      existingDocuments: []
    };
  }
}

/**
 * Format duplicate check message for user display
 * @param result - The duplicate check result
 * @returns User-friendly message
 */
export function formatDuplicateMessage(result: DuplicateCheckResult): string {
  if (!result.isDuplicate) {
    return '';
  }

  const doc = result.existingDocument;
  if (!doc) {
    return result.message;
  }

  const uploadDate = new Date(doc.created_at).toLocaleDateString();
  const signedDate = doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : null;

  let message = `Document "${doc.file_name}" was previously uploaded on ${uploadDate}`;
  
  if (doc.status === 'completed' && signedDate) {
    message += ` and completed on ${signedDate}`;
  } else if (doc.status === 'signed' && signedDate) {
    message += ` and signed on ${signedDate}`;
  }

  if (doc.signer_id) {
    message += ` by ${doc.signer_id}`;
  }

  message += '. ' + result.message;

  return message;
}
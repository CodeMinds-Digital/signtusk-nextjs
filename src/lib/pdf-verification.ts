import { PDFDocument } from 'pdf-lib';
import { verifySignature } from '@/lib/signing';
import { generateDocumentHashServer } from '@/lib/document-server';

export interface SignatureInfo {
  id: string;
  signerName: string;
  signerId: string;
  signature: string;
  timestamp: string;
  isValid?: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  isSignedPDF: boolean;
  originalHash?: string;
  signedHash?: string;
  signatures: SignatureInfo[];
  documentInfo: {
    fileName: string;
    fileSize: number;
    pageCount: number;
  };
  error?: string;
}

/**
 * Extract signature information from a signed PDF
 * @param file - The signed PDF file
 * @returns Promise that resolves to extracted signature information
 */
export async function extractSignatureInfo(file: File): Promise<{
  signatures: SignatureInfo[];
  originalHash?: string;
  isSignedPDF: boolean;
}> {
  try {
    // Read the PDF content as text to look for embedded signature data
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    // For our implementation, we embedded signature info as text in the PDF
    // In a production system, you might use PDF annotations or metadata

    // Convert PDF to text to extract signature information
    // This is a simplified approach - in production you'd use proper PDF parsing
    const pdfBytes = await pdfDoc.save();
    const pdfText = new TextDecoder('latin1').decode(pdfBytes);

    const signatures: SignatureInfo[] = [];
    let originalHash: string | undefined;
    let isSignedPDF = false;

    // Look for signature patterns in the PDF text
    // Our signed PDFs contain signature information as text
    const signaturePattern = /Signature:\s*([a-f0-9]{40,})/gi;
    const signerPattern = /Signed by:\s*([^\n\r]+)/gi;
    const datePattern = /Date:\s*([^\n\r]+)/gi;
    const idPattern = /ID:\s*([^\n\r]+)/gi;

    let signatureMatch;
    let signerMatch;
    let dateMatch;
    let idMatch;

    // Extract signature data
    const signatureMatches = [...pdfText.matchAll(signaturePattern)];
    const signerMatches = [...pdfText.matchAll(signerPattern)];
    const dateMatches = [...pdfText.matchAll(datePattern)];
    const idMatches = [...pdfText.matchAll(idPattern)];

    // Check if this is a signed PDF by looking for our signature markers
    if (pdfText.includes('DIGITALLY') && pdfText.includes('SIGNED')) {
      isSignedPDF = true;
    }

    // Match signatures with their metadata
    for (let i = 0; i < signatureMatches.length; i++) {
      const signature = signatureMatches[i]?.[1];
      const signerName = signerMatches[i]?.[1]?.trim();
      const signerId = idMatches[i]?.[1]?.trim();
      const timestamp = dateMatches[i]?.[1]?.trim();

      if (signature && signerName && signerId) {
        signatures.push({
          id: `sig_${i + 1}`,
          signerName,
          signerId,
          signature,
          timestamp: timestamp || new Date().toISOString()
        });
      }
    }

    // Try to extract original document hash from metadata or text
    const hashPattern = /Original Hash:\s*([a-f0-9]{64})/i;
    const hashMatch = pdfText.match(hashPattern);
    if (hashMatch) {
      originalHash = hashMatch[1];
    }

    return {
      signatures,
      originalHash,
      isSignedPDF
    };

  } catch (error) {
    console.error('Error extracting signature info:', error);
    return {
      signatures: [],
      isSignedPDF: false
    };
  }
}

/**
 * Verify a signed PDF document
 * @param file - The PDF file to verify
 * @returns Promise that resolves to verification result
 */
export async function verifySignedPDF(file: File): Promise<VerificationResult> {
  try {
    // Get basic document info
    const documentInfo = {
      fileName: file.name,
      fileSize: file.size,
      pageCount: 0
    };

    // Try to get page count
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      documentInfo.pageCount = pdfDoc.getPageCount();
    } catch (error) {
      console.warn('Could not get page count:', error);
    }

    // Extract signature information
    const { signatures, originalHash, isSignedPDF } = await extractSignatureInfo(file);

    if (!isSignedPDF) {
      // This might be an original document, try to verify against database
      const documentHash = await generateDocumentHashServer(file);

      return {
        isValid: false,
        isSignedPDF: false,
        signedHash: documentHash,
        signatures: [],
        documentInfo,
        error: 'This appears to be an original document, not a signed PDF. Please upload a signed document for verification.'
      };
    }

    if (signatures.length === 0) {
      return {
        isValid: false,
        isSignedPDF: true,
        signatures: [],
        documentInfo,
        error: 'No signatures found in the signed PDF'
      };
    }

    // Verify each signature
    const verifiedSignatures: SignatureInfo[] = [];
    let allValid = true;

    for (const sig of signatures) {
      try {
        // For signature verification, we need the original document hash
        // If we don't have it embedded, we'll need to look it up in the database
        let hashToVerify = originalHash;

        if (!hashToVerify) {
          // Try to find the original hash by looking up the signature in the database
          const { supabase } = await import('@/lib/database');
          const { data: dbSignatures } = await supabase
            .from('document_signatures')
            .select(`
              *,
              documents(original_hash)
            `)
            .eq('signature', sig.signature)
            .limit(1);

          if (dbSignatures && dbSignatures.length > 0) {
            hashToVerify = dbSignatures[0].documents?.original_hash;
          }
        }

        if (!hashToVerify) {
          verifiedSignatures.push({
            ...sig,
            isValid: false
          });
          allValid = false;
          continue;
        }

        // Verify the signature against the original document hash
        const isValid = await verifySignature(hashToVerify, sig.signature);

        verifiedSignatures.push({
          ...sig,
          isValid
        });

        if (!isValid) {
          allValid = false;
        }

      } catch (error) {
        console.error('Error verifying signature:', error);
        verifiedSignatures.push({
          ...sig,
          isValid: false
        });
        allValid = false;
      }
    }

    // Generate hash of the signed PDF
    const signedHash = await generateDocumentHashServer(file);

    return {
      isValid: allValid,
      isSignedPDF: true,
      originalHash,
      signedHash,
      signatures: verifiedSignatures,
      documentInfo
    };

  } catch (error) {
    console.error('Error verifying signed PDF:', error);

    return {
      isValid: false,
      isSignedPDF: false,
      signatures: [],
      documentInfo: {
        fileName: file.name,
        fileSize: file.size,
        pageCount: 0
      },
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Verify a document (either original or signed PDF)
 * @param file - The document file to verify
 * @param providedSignature - Optional signature to verify against
 * @returns Promise that resolves to verification result
 */
export async function verifyDocument(file: File, providedSignature?: string): Promise<VerificationResult> {
  try {
    // First, try to verify as a signed PDF
    const pdfResult = await verifySignedPDF(file);

    if (pdfResult.isSignedPDF) {
      return pdfResult;
    }

    // If not a signed PDF, treat as original document
    const documentHash = await generateDocumentHashServer(file);

    if (providedSignature) {
      // Verify provided signature against document hash
      const isValid = await verifySignature(documentHash, providedSignature);

      return {
        isValid,
        isSignedPDF: false,
        signedHash: documentHash,
        signatures: [{
          id: 'provided',
          signerName: 'Unknown',
          signerId: 'Unknown',
          signature: providedSignature,
          timestamp: new Date().toISOString(),
          isValid
        }],
        documentInfo: {
          fileName: file.name,
          fileSize: file.size,
          pageCount: 0
        }
      };
    }

    // Look up document in database by both original_hash and signed_hash
    const { supabase } = await import('@/lib/database');
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_signatures(*)
      `)
      .or(`original_hash.eq.${documentHash},signed_hash.eq.${documentHash}`);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!documents || documents.length === 0) {
      return {
        isValid: false,
        isSignedPDF: false,
        signedHash: documentHash,
        signatures: [],
        documentInfo: {
          fileName: file.name,
          fileSize: file.size,
          pageCount: 0
        },
        error: 'Document not found in signed documents database'
      };
    }

    const document = documents[0];
    const dbSignatures = document.document_signatures || [];

    if (dbSignatures.length === 0) {
      return {
        isValid: false,
        isSignedPDF: false,
        signedHash: documentHash,
        signatures: [],
        documentInfo: {
          fileName: file.name,
          fileSize: file.size,
          pageCount: 0
        },
        error: 'No signatures found for this document'
      };
    }

    // Verify all signatures from database
    const verifiedSignatures: SignatureInfo[] = [];
    let allValid = true;

    // Use the original document hash for signature verification
    const hashForVerification = document.original_hash;

    for (const dbSig of dbSignatures) {
      const isValid = await verifySignature(hashForVerification, dbSig.signature);

      // Get the actual signer name/info - signer_id is the custom ID, not the name
      let signerName = dbSig.signer_id; // Default to signer_id

      // Try to get more descriptive signer information from metadata or other sources
      if (document.metadata && document.metadata.signerInfo) {
        signerName = document.metadata.signerInfo;
      }

      verifiedSignatures.push({
        id: dbSig.id,
        signerName: signerName,
        signerId: dbSig.signer_id,
        signature: dbSig.signature,
        timestamp: dbSig.signed_at || dbSig.created_at,
        isValid
      });

      if (!isValid) {
        allValid = false;
      }
    }

    return {
      isValid: allValid,
      isSignedPDF: false,
      originalHash: document.original_hash,
      signedHash: document.signed_hash || documentHash,
      signatures: verifiedSignatures,
      documentInfo: {
        fileName: file.name,
        fileSize: file.size,
        pageCount: 0
      }
    };

  } catch (error) {
    console.error('Error verifying document:', error);

    return {
      isValid: false,
      isSignedPDF: false,
      signatures: [],
      documentInfo: {
        fileName: file.name,
        fileSize: file.size,
        pageCount: 0
      },
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
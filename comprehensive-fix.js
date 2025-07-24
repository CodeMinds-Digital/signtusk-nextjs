const fs = require('fs');

console.log('Starting comprehensive fix...');

// Fix API file
console.log('Fixing API file...');
let apiContent = fs.readFileSync('src/app/api/documents/verify/route.ts', 'utf8');

// Fix the details object structure
const detailsSection = `details: {
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
      },`;

// Replace the problematic details section
apiContent = apiContent.replace(
  /details: \{[\s\S]*?metadata: documentMetadata[\s\S]*?\},/,
  detailsSection
);

fs.writeFileSync('src/app/api/documents/verify/route.ts', apiContent);
console.log('API file fixed');

// Fix verification file
console.log('Fixing verification file...');
let verificationContent = fs.readFileSync('src/lib/pdf-verification.ts', 'utf8');

// Fix the database verification section
const fixedVerificationSection = `    // Use the original document hash for signature verification
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
    }`;

// Replace the problematic verification section
verificationContent = verificationContent.replace(
  /\/\/ Use the original document hash for signature verification[\s\S]*?allValid = false;\s*\}\s*\}/,
  fixedVerificationSection
);

fs.writeFileSync('src/lib/pdf-verification.ts', verificationContent);
console.log('Verification file fixed');

console.log('All fixes applied successfully!');
const fs = require('fs');

// Read the verification file
let content = fs.readFileSync('src/lib/pdf-verification.ts', 'utf8');

// Find the problematic section and replace it entirely
const startMarker = '// Use the original document hash for signature verification';
const endMarker = 'return {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find markers');
  process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

const fixedSection = `// Use the original document hash for signature verification
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

    `;

const newContent = before + fixedSection + after;

fs.writeFileSync('src/lib/pdf-verification.ts', newContent);
console.log('Verification file fixed successfully!');
const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/lib/pdf-verification.ts', 'utf8');

// Fix the missing comma in function call
content = content.replace(
  'verifySignature(hashForVerification dbSig.signature)',
  'verifySignature(hashForVerification, dbSig.signature)'
);

// Fix missing commas in object properties
content = content.replace(/id: dbSig\.id$/gm, 'id: dbSig.id,');
content = content.replace(/signerName: dbSig\.signer_id$/gm, 'signerName: dbSig.signer_id,');
content = content.replace(/signerId: dbSig\.signer_id$/gm, 'signerId: dbSig.signer_id,');
content = content.replace(/signature: dbSig\.signature$/gm, 'signature: dbSig.signature,');
content = content.replace(/timestamp: dbSig\.signed_at \|\| dbSig\.created_at$/gm, 'timestamp: dbSig.signed_at || dbSig.created_at,');

// Write the file back
fs.writeFileSync('src/lib/pdf-verification.ts', content);

console.log('Fixed syntax errors in pdf-verification.ts');
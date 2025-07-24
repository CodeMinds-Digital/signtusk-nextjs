const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/lib/pdf-verification.ts', 'utf8');

// Split into lines
let lines = content.split('\n');

// Find and fix the problematic lines
for (let i = 0; i < lines.length; i++) {
  // Fix the function call
  if (lines[i].includes('verifySignature(hashForVerification dbSig.signature)')) {
    lines[i] = lines[i].replace('hashForVerification dbSig.signature', 'hashForVerification, dbSig.signature');
  }
  
  // Fix missing commas in object properties
  if (lines[i].trim() === 'id: dbSig.id') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'signerName: signerName') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'signerId: dbSig.signer_id') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'signature: dbSig.signature') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'timestamp: dbSig.signed_at || dbSig.created_at') {
    lines[i] = lines[i] + ',';
  }
}

// Join back and write
content = lines.join('\n');
fs.writeFileSync('src/lib/pdf-verification.ts', content);

console.log('Fixed syntax issues manually');
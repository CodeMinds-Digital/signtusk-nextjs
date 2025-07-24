const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/app/api/documents/verify/route.ts', 'utf8');

// Split into lines
let lines = content.split('\n');

// Find and fix the problematic lines
for (let i = 0; i < lines.length; i++) {
  // Fix missing commas in object properties
  if (lines[i].trim() === 'fileName: verificationResult.documentInfo.fileName') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'documentHash: verificationResult.signedHash || verificationResult.originalHash') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'fileSize: verificationResult.documentInfo.fileSize') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'isSignedPDF: verificationResult.isSignedPDF') {
    lines[i] = lines[i].replace('verificationResult.isSignedPDF', 'verificationResult.isSignedPDF || (verificationResult.signedHash !== verificationResult.originalHash)') + ',';
  }
  if (lines[i].trim() === 'originalHash: verificationResult.originalHash') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'signedHash: verificationResult.signedHash') {
    lines[i] = lines[i] + ',';
  }
  if (lines[i].trim() === 'signatures: verificationResult.signatures') {
    lines[i] = lines[i] + ',';
  }
}

// Join back and write
content = lines.join('\n');
fs.writeFileSync('src/app/api/documents/verify/route.ts', content);

console.log('Fixed API syntax issues');
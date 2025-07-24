const fs = require('fs');

// Read the current file
let content = fs.readFileSync('src/lib/pdf-verification.ts', 'utf8');

// Read the fixed section
const fixedSection = fs.readFileSync('verification-fix.txt', 'utf8');

// Find the problematic section and replace it
const startPattern = /\/\/ Use the original document hash for signature verification/;
const endPattern = /\s+return \{/;

// Find the start and end positions
const startMatch = content.match(startPattern);
if (!startMatch) {
  console.log('Could not find start pattern');
  process.exit(1);
}

const startIndex = startMatch.index;
const afterStart = content.substring(startIndex);
const endMatch = afterStart.match(endPattern);
if (!endMatch) {
  console.log('Could not find end pattern');
  process.exit(1);
}

const endIndex = startIndex + endMatch.index;

// Replace the section
const before = content.substring(0, startIndex);
const after = content.substring(endIndex);
const newContent = before + fixedSection + '\n\n    return {' + after.substring(after.indexOf('return {') + 8);

// Write the file back
fs.writeFileSync('src/lib/pdf-verification.ts', newContent);

console.log('Successfully replaced the problematic section');
// Script to investigate and potentially fix signer ID issues
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || supabaseKey) {
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.log('You can find these in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateSignerIds() {
  console.log('🔍 Investigating Signer ID Issues...\n');

  // Get all document signatures
  const { data: signatures, error } = await supabase
    .from('document_signatures')
    .select(`
      *,
      documents(*)
    `);

  if (error) {
    console.error('Error fetching signatures:', error);
    return;
  }

  console.log(`Found ${signatures.length} signatures in database:\n`);

  signatures.forEach((sig, index) => {
    console.log(`Signature ${index + 1}:`);
    console.log(`  ID: ${sig.id}`);
    console.log(`  Document ID: ${sig.document_id}`);
    console.log(`  Signer ID: ${sig.signer_id}`);
    console.log(`  Signer Address: ${sig.signer_address}`);
    console.log(`  Signature: ${sig.signature.substring(0, 20)}...`);
    console.log(`  Signed At: ${sig.signed_at}`);
    
    if (sig.documents) {
      console.log(`  Document: ${sig.documents.file_name}`);
      console.log(`  Metadata: ${JSON.stringify(sig.documents.metadata, null, 2)}`);
    }
    console.log('');
  });

  // Check if there are any patterns or issues
  const signerIds = signatures.map(s => s.signer_id);
  const uniqueSignerIds = [...new Set(signerIds)];
  
  console.log(`Unique Signer IDs found: ${uniqueSignerIds.join(', ')}`);
  
  // Check if the expected signer ID exists anywhere
  const expectedSignerId = 'NXC2869GZWB1967';
  const hasExpectedId = signerIds.includes(expectedSignerId);
  
  console.log(`\nExpected Signer ID (${expectedSignerId}) found: ${hasExpectedId ? 'YES' : 'NO'}`);
  
  if (!hasExpectedId) {
    console.log('\n⚠️  The expected signer ID was not found in the database.');
    console.log('This suggests either:');
    console.log('1. The wrong signer ID was stored during signing');
    console.log('2. The expected signer ID is incorrect');
    console.log('3. There\'s a data inconsistency');
    
    console.log('\n🔧 Would you like to:');
    console.log('1. Update the existing signer_id from FCU4648XGHG7369 to NXC2869GZWB1967?');
    console.log('2. Investigate the signing process to see why the wrong ID was stored?');
    console.log('3. Check if there are multiple users/wallets involved?');
  }
}

// Run the investigation
investigateSignerIds().catch(console.error);
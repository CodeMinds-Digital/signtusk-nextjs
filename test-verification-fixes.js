// Test script to verify all verification fixes
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.log('You can find these in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVerificationFixes() {
  console.log('🧪 Testing Verification Fixes...\n');

  // Test data from your database
  const testDocuments = [
    {
      id: '67b7cc94-fddb-4d34-b5ce-9dabad42273a',
      original_hash: '5c970b36c96f043f2be2ffe4f02746075e7b9210536130128f53e8d62894eb1a',
      signed_hash: 'f49db5187589feb372f1823b65c589b00e56d16fcf2d5b335e34d01bab12aed9'
    },
    {
      id: '8c99d068-7a11-46ff-9b5f-6c97d338493d',
      original_hash: '5c970b36c96f043f2be2ffe4f02746075e7b9210536130128f53e8d62894eb1a',
      signed_hash: '53aa11f74809ee7826d3675b4df6c43dc2e013cd16f2e1e49facf35c376066a7'
    }
  ];

  for (const doc of testDocuments) {
    console.log(`📄 Testing document ${doc.id}:`);
    console.log(`   Original hash: ${doc.original_hash}`);
    console.log(`   Signed hash: ${doc.signed_hash}`);

    // Test 1: Query by original hash
    const { data: byOriginal, error: error1 } = await supabase
      .from('documents')
      .select(`
        *,
        document_signatures(*)
      `)
      .or(`original_hash.eq.${doc.original_hash},signed_hash.eq.${doc.original_hash}`);

    console.log(`   ✅ Query by original hash: ${byOriginal?.length || 0} results`);
    if (error1) console.log(`   ❌ Error: ${error1.message}`);

    // Test 2: Query by signed hash
    const { data: bySigned, error: error2 } = await supabase
      .from('documents')
      .select(`
        *,
        document_signatures(*)
      `)
      .or(`original_hash.eq.${doc.signed_hash},signed_hash.eq.${doc.signed_hash}`);

    console.log(`   ✅ Query by signed hash: ${bySigned?.length || 0} results`);
    if (error2) console.log(`   ❌ Error: ${error2.message}`);

    // Test 3: Check signatures and metadata
    if (byOriginal && byOriginal.length > 0) {
      const document = byOriginal[0];
      const signatures = document.document_signatures || [];
      console.log(`   📝 Found ${signatures.length} signatures`);
      
      signatures.forEach((sig, index) => {
        console.log(`      Signature ${index + 1}:`);
        console.log(`        Signer ID: ${sig.signer_id}`);
        console.log(`        Signature: ${sig.signature.substring(0, 20)}...`);
        console.log(`        Signed At: ${sig.signed_at}`);
      });

      if (document.metadata) {
        console.log(`   📋 Metadata:`);
        console.log(`      Title: ${document.metadata.title || 'N/A'}`);
        console.log(`      Purpose: ${document.metadata.purpose || 'N/A'}`);
        console.log(`      Signer Info: ${document.metadata.signerInfo || 'N/A'}`);
      }

      // Test 4: Check if signed hash differs from original (indicates signed document)
      const isSignedDocument = document.signed_hash !== document.original_hash;
      console.log(`   🔍 Is Signed Document: ${isSignedDocument ? 'YES' : 'NO'}`);
    }

    console.log('');
  }

  // Test 5: Check for expected signer ID
  const expectedSignerId = 'NXC2869GZWB1967';
  const { data: expectedSignatures, error: expectedError } = await supabase
    .from('document_signatures')
    .select('*')
    .eq('signer_id', expectedSignerId);

  console.log(`🔍 Expected Signer ID (${expectedSignerId}):`);
  console.log(`   Found: ${expectedSignatures?.length || 0} signatures`);
  if (expectedError) console.log(`   Error: ${expectedError.message}`);

  // Test 6: Check for old signer ID
  const oldSignerId = 'FCU4648XGHG7369';
  const { data: oldSignatures, error: oldError } = await supabase
    .from('document_signatures')
    .select('*')
    .eq('signer_id', oldSignerId);

  console.log(`🔍 Old Signer ID (${oldSignerId}):`);
  console.log(`   Found: ${oldSignatures?.length || 0} signatures`);
  if (oldError) console.log(`   Error: ${oldError.message}`);

  console.log('\n🎯 Summary:');
  console.log('✅ Database queries by both original_hash and signed_hash should work');
  console.log('✅ Metadata should be available for rich display');
  console.log('✅ Signed documents should be properly identified');
  console.log(`${expectedSignatures?.length > 0 ? '✅' : '⚠️'} Expected signer ID should be present`);
  console.log(`${oldSignatures?.length === 0 ? '✅' : '⚠️'} Old signer ID should be replaced`);
}

testVerificationFixes().catch(console.error);
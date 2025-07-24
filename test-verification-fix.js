// Test script to verify the verification fix works with existing data
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVerificationFix() {
  console.log('Testing verification fix...\n');

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
    console.log(`Testing document ${doc.id}:`);
    console.log(`  Original hash: ${doc.original_hash}`);
    console.log(`  Signed hash: ${doc.signed_hash}`);

    // Test 1: Query by original hash (should work)
    const { data: byOriginal, error: error1 } = await supabase
      .from('documents')
      .select(`
        *,
        document_signatures(*)
      `)
      .or(`original_hash.eq.${doc.original_hash},signed_hash.eq.${doc.original_hash}`);

    console.log(`  Query by original hash: ${byOriginal?.length || 0} results`);
    if (error1) console.log(`  Error: ${error1.message}`);

    // Test 2: Query by signed hash (should work with fix)
    const { data: bySigned, error: error2 } = await supabase
      .from('documents')
      .select(`
        *,
        document_signatures(*)
      `)
      .or(`original_hash.eq.${doc.signed_hash},signed_hash.eq.${doc.signed_hash}`);

    console.log(`  Query by signed hash: ${bySigned?.length || 0} results`);
    if (error2) console.log(`  Error: ${error2.message}`);

    // Test 3: Check signatures
    if (byOriginal && byOriginal.length > 0) {
      const signatures = byOriginal[0].document_signatures || [];
      console.log(`  Found ${signatures.length} signatures`);
      signatures.forEach((sig, index) => {
        console.log(`    Signature ${index + 1}: ${sig.signature.substring(0, 20)}...`);
      });
    }

    console.log('');
  }

  console.log('Verification fix test completed!');
}

testVerificationFix().catch(console.error);
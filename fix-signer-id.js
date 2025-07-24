// Script to fix signer ID issues
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

async function fixSignerIds() {
  console.log('🔧 Fixing Signer ID Issues...\n');

  const oldSignerId = 'FCU4648XGHG7369';
  const newSignerId = 'NXC2869GZWB1967';

  console.log(`Updating signer_id from "${oldSignerId}" to "${newSignerId}"`);

  // Update document_signatures table
  const { data: updatedSignatures, error: sigError } = await supabase
    .from('document_signatures')
    .update({ signer_id: newSignerId })
    .eq('signer_id', oldSignerId)
    .select();

  if (sigError) {
    console.error('Error updating document_signatures:', sigError);
    return;
  }

  console.log(`✅ Updated ${updatedSignatures.length} signatures`);

  // Also check if there are any other tables that might need updating
  // (like user profiles, wallets, etc.)
  
  // Verify the changes
  const { data: verifySignatures, error: verifyError } = await supabase
    .from('document_signatures')
    .select('*')
    .eq('signer_id', newSignerId);

  if (verifyError) {
    console.error('Error verifying changes:', verifyError);
    return;
  }

  console.log(`\n✅ Verification: Found ${verifySignatures.length} signatures with new signer ID`);
  
  verifySignatures.forEach((sig, index) => {
    console.log(`  ${index + 1}. Document ID: ${sig.document_id}, Signer ID: ${sig.signer_id}`);
  });

  console.log('\n🎉 Signer ID fix completed successfully!');
  console.log('The verification should now show the correct signer ID.');
}

// Run the fix
fixSignerIds().catch(console.error);
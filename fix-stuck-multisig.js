// Quick fix script for stuck multi-signature request
// Run with: node fix-stuck-multisig.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please set:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStuckMultiSignature() {
  const multiSigId = '6c5463f1-3883-42e3-b52c-aefe327ed1cf';
  
  console.log('🔧 Fixing stuck multi-signature request:', multiSigId);
  console.log('=' .repeat(60));

  try {
    // Get current status
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .select('*')
      .eq('id', multiSigId)
      .single();

    if (multiSigError || !multiSigRequest) {
      console.error('❌ Multi-signature request not found');
      return;
    }

    console.log('📋 Current Status:', multiSigRequest.status);

    // Get all signers
    const { data: signers, error: signersError } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSigId)
      .order('signing_order', { ascending: true });

    if (signersError || !signers) {
      console.error('❌ Failed to fetch signers');
      return;
    }

    const signedSigners = signers.filter(s => s.status === 'signed');
    const totalSigners = signers.length;
    const allSigned = signedSigners.length === totalSigners && totalSigners > 0;

    console.log('👥 Signers Analysis:');
    console.log(`   Total: ${totalSigners}`);
    console.log(`   Signed: ${signedSigners.length}`);
    console.log(`   All Signed: ${allSigned}`);
    console.log('');

    signers.forEach((signer, index) => {
      console.log(`   ${index + 1}. ${signer.signer_custom_id} - ${signer.status} ${signer.status === 'signed' ? '✅' : '⏳'}`);
    });
    console.log('');

    if (allSigned && multiSigRequest.status !== 'completed') {
      console.log('🔧 FIXING: All signers signed but status is still pending');
      
      // Try database function first
      console.log('   Trying database function...');
      const { data: completionResult, error: completionError } = await supabase
        .rpc('complete_multi_signature_request', { request_id: multiSigId });

      if (!completionError && completionResult) {
        console.log('✅ Fixed using database function!');
      } else {
        console.log('   Database function failed, trying manual update...');
        
        // Manual update
        const { error: updateError } = await supabase
          .from('multi_signature_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            current_signers: totalSigners
          })
          .eq('id', multiSigId);

        if (!updateError) {
          console.log('✅ Fixed manually!');
          
          // Also update document status
          if (multiSigRequest.document_id) {
            const { error: docUpdateError } = await supabase
              .from('documents')
              .update({
                status: 'completed'
              })
              .eq('id', multiSigRequest.document_id);

            if (!docUpdateError) {
              console.log('✅ Document status also updated!');
            } else {
              console.error('❌ Failed to update document status:', docUpdateError);
            }
          }
        } else {
          console.error('❌ Failed to update status:', updateError);
        }
      }

      // Verify the fix
      const { data: updatedRequest } = await supabase
        .from('multi_signature_requests')
        .select('status, completed_at')
        .eq('id', multiSigId)
        .single();

      if (updatedRequest) {
        console.log('');
        console.log('🎉 Final Status:', updatedRequest.status);
        console.log('📅 Completed At:', updatedRequest.completed_at);
      }

    } else if (allSigned && multiSigRequest.status === 'completed') {
      console.log('✅ Status is already correct: completed');
    } else {
      console.log('ℹ️  No fix needed: Not all signers have signed yet');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixStuckMultiSignature()
  .then(() => {
    console.log('');
    console.log('🏁 Fix attempt complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });

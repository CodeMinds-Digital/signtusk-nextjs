// Debug script to check multi-signature status
// Run with: node debug-multi-signature-status.js

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

async function debugMultiSignatureStatus() {
  const multiSigId = '6c5463f1-3883-42e3-b52c-aefe327ed1cf';
  
  console.log('🔍 Debugging Multi-Signature Status for ID:', multiSigId);
  console.log('=' .repeat(60));

  try {
    // Get multi-signature request details
    const { data: multiSigRequest, error: multiSigError } = await supabase
      .from('multi_signature_requests')
      .select('*')
      .eq('id', multiSigId)
      .single();

    if (multiSigError) {
      console.error('❌ Error fetching multi-signature request:', multiSigError);
      return;
    }

    if (!multiSigRequest) {
      console.error('❌ Multi-signature request not found');
      return;
    }

    console.log('📋 Multi-Signature Request Details:');
    console.log('   ID:', multiSigRequest.id);
    console.log('   Status:', multiSigRequest.status);
    console.log('   Current Signer Index:', multiSigRequest.current_signer_index);
    console.log('   Current Signers Count:', multiSigRequest.current_signers);
    console.log('   Required Signers:', multiSigRequest.required_signers);
    console.log('   Created At:', multiSigRequest.created_at);
    console.log('   Completed At:', multiSigRequest.completed_at);
    console.log('');

    // Get all signers
    const { data: signers, error: signersError } = await supabase
      .from('required_signers')
      .select('*')
      .eq('multi_signature_request_id', multiSigId)
      .order('signing_order', { ascending: true });

    if (signersError) {
      console.error('❌ Error fetching signers:', signersError);
      return;
    }

    console.log('👥 Signers Details:');
    console.log('   Total Signers:', signers?.length || 0);
    console.log('');

    if (signers && signers.length > 0) {
      signers.forEach((signer, index) => {
        console.log(`   Signer ${index + 1}:`);
        console.log(`     Custom ID: ${signer.signer_custom_id}`);
        console.log(`     Signing Order: ${signer.signing_order}`);
        console.log(`     Status: ${signer.status}`);
        console.log(`     Signed At: ${signer.signed_at || 'Not signed'}`);
        console.log(`     Has Signature: ${signer.signature ? 'Yes' : 'No'}`);
        console.log('');
      });

      // Analyze status
      const signedSigners = signers.filter(s => s.status === 'signed');
      const pendingSigners = signers.filter(s => s.status === 'pending');
      const rejectedSigners = signers.filter(s => s.status === 'rejected');

      console.log('📊 Status Analysis:');
      console.log(`   Signed: ${signedSigners.length}`);
      console.log(`   Pending: ${pendingSigners.length}`);
      console.log(`   Rejected: ${rejectedSigners.length}`);
      console.log(`   Total: ${signers.length}`);
      console.log('');

      const allSigned = signers.every(signer => signer.status === 'signed');
      const shouldBeCompleted = allSigned && signers.length > 0;

      console.log('🎯 Status Check:');
      console.log(`   All signers signed: ${allSigned}`);
      console.log(`   Should be completed: ${shouldBeCompleted}`);
      console.log(`   Current status: ${multiSigRequest.status}`);
      console.log(`   Status is correct: ${shouldBeCompleted ? multiSigRequest.status === 'completed' : multiSigRequest.status === 'pending'}`);
      console.log('');

      if (shouldBeCompleted && multiSigRequest.status !== 'completed') {
        console.log('🔧 ISSUE DETECTED: All signers have signed but status is still pending!');
        console.log('');
        console.log('💡 Suggested Fix: Update the multi-signature request status to "completed"');
        
        // Offer to fix the status
        console.log('🛠️  Attempting to fix the status...');
        
        const { error: updateError } = await supabase
          .from('multi_signature_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', multiSigId);

        if (updateError) {
          console.error('❌ Failed to update status:', updateError);
        } else {
          console.log('✅ Status updated successfully to "completed"!');
          
          // Also update the document status
          if (multiSigRequest.document_id) {
            const { error: docUpdateError } = await supabase
              .from('documents')
              .update({
                status: 'completed'
              })
              .eq('id', multiSigRequest.document_id);

            if (docUpdateError) {
              console.error('❌ Failed to update document status:', docUpdateError);
            } else {
              console.log('✅ Document status also updated to "completed"!');
            }
          }
        }
      } else if (shouldBeCompleted && multiSigRequest.status === 'completed') {
        console.log('✅ Status is correct: All signers signed and status is completed');
      } else {
        console.log('ℹ️  Status is correct: Not all signers have signed yet');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug function
debugMultiSignatureStatus()
  .then(() => {
    console.log('🏁 Debug complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });

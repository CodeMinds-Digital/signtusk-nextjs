// Test Supabase Storage Connection
// Run with: node test-storage.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Storage Connection...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('- SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Missing required environment variables!');
  console.log('Please add to your .env.local:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_project_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testStorageConnection() {
  try {
    console.log('🧪 Testing storage connection...');
    
    // Test 1: List buckets
    console.log('\n1. Testing bucket access...');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Bucket access failed:', bucketsError.message);
      return false;
    }
    
    console.log('✅ Bucket access successful');
    console.log('Available buckets:', buckets.map(b => b.name).join(', '));
    
    // Test 2: Check if documents bucket exists
    console.log('\n2. Checking documents bucket...');
    const documentsBucket = buckets.find(b => b.id === 'documents');
    
    if (!documentsBucket) {
      console.log('⚠️  Documents bucket not found. Creating it...');
      
      const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain']
      });
      
      if (createError) {
        console.log('❌ Failed to create documents bucket:', createError.message);
        return false;
      }
      
      console.log('✅ Documents bucket created successfully');
    } else {
      console.log('✅ Documents bucket exists');
      console.log('Bucket settings:', {
        public: documentsBucket.public,
        fileSizeLimit: documentsBucket.file_size_limit,
        allowedMimeTypes: documentsBucket.allowed_mime_types
      });
    }
    
    // Test 3: Test file upload (create a small test file)
    console.log('\n3. Testing file upload...');
    const testContent = 'This is a test file for Supabase storage';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testFileName = `test_${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(testFileName, testBlob);
    
    if (uploadError) {
      console.log('❌ File upload failed:', uploadError.message);
      return false;
    }
    
    console.log('✅ File upload successful');
    console.log('Upload path:', uploadData.path);
    
    // Test 4: Get public URL
    console.log('\n4. Testing public URL generation...');
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(testFileName);
    
    console.log('✅ Public URL generated:', urlData.publicUrl);
    
    // Test 5: Download file
    console.log('\n5. Testing file download...');
    const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(testFileName);
    
    if (downloadError) {
      console.log('❌ File download failed:', downloadError.message);
      return false;
    }
    
    const downloadedText = await downloadData.text();
    console.log('✅ File download successful');
    console.log('Downloaded content:', downloadedText);
    
    // Test 6: Clean up test file
    console.log('\n6. Cleaning up test file...');
    const { error: deleteError } = await supabaseAdmin.storage
      .from('documents')
      .remove([testFileName]);
    
    if (deleteError) {
      console.log('⚠️  Failed to delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file deleted successfully');
    }
    
    console.log('\n🎉 All storage tests passed! Your setup is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('1. Your document upload should now work');
    console.log('2. Try uploading a document in your app');
    console.log('3. Check the Supabase Storage dashboard to see uploaded files');
    
    return true;
    
  } catch (error) {
    console.log('❌ Storage test failed with error:', error.message);
    return false;
  }
}

// Run the test
testStorageConnection().then(success => {
  if (!success) {
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify your SUPABASE_SERVICE_ROLE_KEY is correct');
    console.log('2. Check your Supabase project URL');
    console.log('3. Ensure your Supabase project is active');
    console.log('4. Try regenerating your service role key');
    process.exit(1);
  }
}).catch(error => {
  console.log('❌ Test script failed:', error.message);
  process.exit(1);
});
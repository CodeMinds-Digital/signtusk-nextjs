-- Verification script for multi-signature sequential migration
-- Run this after applying the migration to verify everything is working

-- Check if new columns exist in multi_signature_requests
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'multi_signature_requests' 
AND column_name IN ('description', 'current_signer_index', 'signing_type')
ORDER BY column_name;

-- Check if new columns exist in required_signers
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'required_signers' 
AND column_name IN ('signing_order', 'signature', 'signature_metadata')
ORDER BY column_name;

-- Check if indexes were created
SELECT 
    indexname, 
    tablename, 
    indexdef
FROM pg_indexes 
WHERE indexname IN (
    'idx_required_signers_order',
    'idx_required_signers_status', 
    'idx_multi_signature_current_signer'
)
ORDER BY indexname;

-- Check if constraint was created
SELECT 
    conname, 
    contype, 
    confupdtype, 
    confdeltype
FROM pg_constraint 
WHERE conname = 'unique_signing_order_per_request';

-- Check if functions were created
SELECT 
    routine_name, 
    routine_type, 
    data_type
FROM information_schema.routines 
WHERE routine_name IN (
    'get_current_signer',
    'advance_to_next_signer',
    'check_all_signers_completed',
    'complete_multi_signature_request'
)
ORDER BY routine_name;

-- Test the functions with a sample (this will return empty results if no data exists)
SELECT 'Testing get_current_signer function...' as test_name;
-- SELECT * FROM get_current_signer('00000000-0000-0000-0000-000000000000'::UUID);

SELECT 'Testing advance_to_next_signer function...' as test_name;
-- SELECT advance_to_next_signer('00000000-0000-0000-0000-000000000000'::UUID);

SELECT 'Testing check_all_signers_completed function...' as test_name;
-- SELECT check_all_signers_completed('00000000-0000-0000-0000-000000000000'::UUID);

-- Show sample data structure (if any exists)
SELECT 
    'Sample multi_signature_requests data:' as info,
    COUNT(*) as total_requests
FROM multi_signature_requests;

SELECT 
    'Sample required_signers data:' as info,
    COUNT(*) as total_signers
FROM required_signers;

-- Check schema version
SELECT 
    version, 
    description, 
    applied_at
FROM schema_version 
WHERE version = '2.1.0';

SELECT 'Migration verification complete!' as status;

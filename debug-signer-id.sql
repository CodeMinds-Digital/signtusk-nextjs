-- Debug Signer ID Mismatch Issue
-- Run these queries in your Supabase SQL Editor to identify the correct Signer ID

-- 1. Check all wallets and their custom_ids
SELECT 
  wallet_address,
  custom_id,
  created_at,
  updated_at
FROM wallets
ORDER BY created_at DESC;

-- 2. Check user profiles and their custom_ids
SELECT 
  custom_id,
  display_name,
  email,
  created_at,
  is_active
FROM user_profiles
ORDER BY created_at DESC;

-- 3. Find the specific user's records (replace with actual wallet address)
-- Replace 'USER_WALLET_ADDRESS' with the actual wallet address
SELECT 
  w.wallet_address,
  w.custom_id as wallet_custom_id,
  up.custom_id as profile_custom_id,
  up.display_name,
  w.created_at as wallet_created,
  up.created_at as profile_created
FROM wallets w
LEFT JOIN user_profiles up ON w.custom_id = up.custom_id
WHERE w.wallet_address = 'USER_WALLET_ADDRESS';

-- 4. Check for duplicate custom_ids (should be empty if constraints work)
SELECT 
  custom_id,
  COUNT(*) as count
FROM wallets
GROUP BY custom_id
HAVING COUNT(*) > 1;

-- 5. Check for orphaned records
SELECT 
  w.custom_id,
  w.wallet_address,
  up.custom_id as profile_custom_id
FROM wallets w
LEFT JOIN user_profiles up ON w.custom_id = up.custom_id
WHERE up.custom_id IS NULL;

-- 6. Check documents signed by each custom_id
SELECT 
  ds.signer_id,
  COUNT(*) as documents_signed,
  MIN(ds.created_at) as first_signature,
  MAX(ds.created_at) as last_signature
FROM document_signatures ds
GROUP BY ds.signer_id
ORDER BY documents_signed DESC;

-- 7. Check recent document signatures for the user
-- Replace 'USER_CUSTOM_ID' with the suspected custom_id
SELECT 
  ds.signer_id,
  ds.signer_address,
  d.file_name,
  ds.created_at,
  ds.signature_type
FROM document_signatures ds
JOIN documents d ON ds.document_id = d.id
WHERE ds.signer_id IN ('NXC2869GZWB1967', 'FCU4648XGHG7369')
ORDER BY ds.created_at DESC;

-- 8. Check Supabase storage paths in documents table
SELECT 
  file_name,
  supabase_path,
  signed_supabase_path,
  status,
  created_at
FROM documents
WHERE supabase_path LIKE '%NXC2869GZWB1967%' 
   OR supabase_path LIKE '%FCU4648XGHG7369%'
   OR signed_supabase_path LIKE '%NXC2869GZWB1967%'
   OR signed_supabase_path LIKE '%FCU4648XGHG7369%'
ORDER BY created_at DESC;

-- 9. Check audit logs for both custom_ids
SELECT 
  user_id,
  action,
  details,
  created_at
FROM audit_logs
WHERE user_id IN ('NXC2869GZWB1967', 'FCU4648XGHG7369')
ORDER BY created_at DESC
LIMIT 20;

-- 10. Find the authoritative custom_id for a wallet address
-- This query will help determine which custom_id is the correct one
-- Replace 'USER_WALLET_ADDRESS' with the actual wallet address
WITH wallet_info AS (
  SELECT 
    w.wallet_address,
    w.custom_id,
    w.created_at as wallet_created,
    up.created_at as profile_created,
    CASE 
      WHEN up.custom_id IS NOT NULL THEN 'VALID'
      ELSE 'ORPHANED'
    END as status
  FROM wallets w
  LEFT JOIN user_profiles up ON w.custom_id = up.custom_id
  WHERE w.wallet_address = 'USER_WALLET_ADDRESS'
)
SELECT 
  wi.*,
  COALESCE(sig_count.signature_count, 0) as signatures_made,
  COALESCE(doc_count.documents_uploaded, 0) as documents_uploaded
FROM wallet_info wi
LEFT JOIN (
  SELECT signer_id, COUNT(*) as signature_count
  FROM document_signatures
  WHERE signer_id = wi.custom_id
  GROUP BY signer_id
) sig_count ON wi.custom_id = sig_count.signer_id
LEFT JOIN (
  SELECT 
    SUBSTRING(supabase_path FROM 'documents/([^/]+)/') as uploader_id,
    COUNT(*) as documents_uploaded
  FROM documents
  WHERE supabase_path LIKE 'documents/' || wi.custom_id || '/%'
  GROUP BY uploader_id
) doc_count ON wi.custom_id = doc_count.uploader_id;

-- 11. Clean up query (USE WITH CAUTION!)
-- This query shows what would be deleted if there are duplicates
-- DO NOT RUN without understanding the implications
/*
-- Find potential duplicate wallets (same address, different custom_id)
SELECT 
  wallet_address,
  custom_id,
  created_at,
  'POTENTIAL_DUPLICATE' as action
FROM wallets w1
WHERE EXISTS (
  SELECT 1 FROM wallets w2 
  WHERE w2.wallet_address = w1.wallet_address 
  AND w2.custom_id != w1.custom_id
)
ORDER BY wallet_address, created_at;
*/

-- 12. Summary query to understand the current state
SELECT 
  'Total Wallets' as metric,
  COUNT(*) as count
FROM wallets
UNION ALL
SELECT 
  'Total User Profiles' as metric,
  COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
  'Wallets with Valid Profiles' as metric,
  COUNT(*) as count
FROM wallets w
JOIN user_profiles up ON w.custom_id = up.custom_id
UNION ALL
SELECT 
  'Orphaned Wallets' as metric,
  COUNT(*) as count
FROM wallets w
LEFT JOIN user_profiles up ON w.custom_id = up.custom_id
WHERE up.custom_id IS NULL
UNION ALL
SELECT 
  'Total Document Signatures' as metric,
  COUNT(*) as count
FROM document_signatures
UNION ALL
SELECT 
  'Unique Signers' as metric,
  COUNT(DISTINCT signer_id) as count
FROM document_signatures;
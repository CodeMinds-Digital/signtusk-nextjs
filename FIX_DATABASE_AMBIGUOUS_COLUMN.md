# Fix for "column reference 'custom_id' is ambiguous" Error

## Problem
When trying to create a secure identity, you're getting this error:
```
Error creating user with wallet: {
  code: '42702',
  details: 'It could refer to either a PL/pgSQL variable or a table column.',
  hint: null,
  message: 'column reference "custom_id" is ambiguous'
}
```

## Root Cause
The error occurs because both `user_profiles` and `wallets` tables have a `custom_id` column, and when they're joined in database functions, PostgreSQL can't determine which `custom_id` column is being referenced.

## Solution

### Step 1: Apply the Fix Script
Run the following SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of database/fix_ambiguous_column_reference.sql
```

Or you can run it directly by copying the file content from:
`signtusk-nextjs/database/fix_ambiguous_column_reference.sql`

### Step 2: Verify the Fix
After running the script, you should see a test message like:
```
NOTICE: Test successful - User ID: [uuid], Custom ID: [custom_id], Wallet: [address]
```

### Step 3: Test Identity Creation
Try creating a secure identity again. The error should be resolved.

## What the Fix Does

1. **Drops problematic functions**: Removes any steganography functions that might have ambiguous column references
2. **Recreates create_user_with_wallet**: Ensures the main user creation function is correct
3. **Adds explicit table qualifications**: All column references now specify which table they belong to
4. **Tests the fix**: Includes a verification test to ensure everything works

## Key Changes Made

### Before (Problematic):
```sql
WHERE custom_id = p_user_custom_id  -- Ambiguous!
```

### After (Fixed):
```sql
WHERE up.custom_id = p_user_custom_id  -- Explicit table reference
```

## Files Modified
- `database/fix_ambiguous_column_reference.sql` - Main fix script
- `database/steganography_schema_fixed.sql` - Fixed steganography schema for future use

## Prevention
To prevent this issue in the future:
1. Always use table aliases in JOIN queries
2. Explicitly qualify column names when tables have similar columns
3. Test database functions after schema changes

## Alternative Quick Fix
If you can't run the full script, you can try this minimal fix in Supabase SQL Editor:

```sql
-- Quick fix: Recreate the main function
DROP FUNCTION IF EXISTS create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255));

CREATE OR REPLACE FUNCTION create_user_with_wallet(
    p_wallet_address VARCHAR(42),
    p_encrypted_private_key TEXT,
    p_encrypted_mnemonic TEXT DEFAULT NULL,
    p_salt VARCHAR(64) DEFAULT NULL,
    p_display_name VARCHAR(100) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
    user_id UUID,
    custom_id VARCHAR(18),
    wallet_address VARCHAR(42)
) AS $$
DECLARE
    v_custom_id VARCHAR(18);
    v_user_id UUID;
    v_wallet_id UUID;
    v_wallet_address VARCHAR(42);
BEGIN
    v_custom_id := generate_custom_id();
    v_wallet_address := LOWER(p_wallet_address);
    
    INSERT INTO user_profiles (custom_id, display_name, email)
    VALUES (v_custom_id, p_display_name, p_email)
    RETURNING id INTO v_user_id;
    
    INSERT INTO wallets (
        user_profile_id, 
        custom_id, 
        wallet_address, 
        encrypted_private_key, 
        encrypted_mnemonic, 
        salt
    )
    VALUES (
        v_user_id, 
        v_custom_id, 
        v_wallet_address, 
        p_encrypted_private_key, 
        p_encrypted_mnemonic, 
        p_salt
    )
    RETURNING id INTO v_wallet_id;
    
    RETURN QUERY SELECT v_user_id, v_custom_id, v_wallet_address;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) TO authenticated;
```

This should resolve the immediate issue and allow secure identity creation to work again.

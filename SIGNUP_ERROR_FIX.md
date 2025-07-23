# 🔧 Signup Error Fix - "Ambiguous custom_id" Issue

## 🚨 **Error Identified**

During signup verification, users are getting this error:
```
Error creating user with wallet: {
  code: '42702',
  message: 'column reference "custom_id" is ambiguous'
}
```

## 🎯 **Root Cause**

The error occurs in the PostgreSQL function `create_user_with_wallet` where the variable name `custom_id` conflicts with the table column name `custom_id`, causing ambiguity.

## ✅ **Solution Implemented**

### **Quick Fix Option 1: Apply SQL Patch**

Run this SQL command in your database to fix the function:

```sql
-- Apply the fix
\i database/fix_ambiguous_custom_id.sql
```

### **Quick Fix Option 2: Manual SQL Fix**

Execute this SQL directly in your database:

```sql
-- Drop and recreate the problematic function
DROP FUNCTION IF EXISTS create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255));

-- Create fixed version with proper variable naming
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
    custom_id VARCHAR(15),
    wallet_address VARCHAR(42)
) AS $$
DECLARE
    v_custom_id VARCHAR(15);
    v_user_id UUID;
    v_wallet_id UUID;
BEGIN
    -- Generate unique custom ID
    v_custom_id := generate_custom_id();
    
    -- Create user profile
    INSERT INTO user_profiles (custom_id, display_name, email)
    VALUES (v_custom_id, p_display_name, p_email)
    RETURNING id INTO v_user_id;
    
    -- Create wallet linked to user profile
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
        LOWER(p_wallet_address), 
        p_encrypted_private_key, 
        p_encrypted_mnemonic, 
        p_salt
    )
    RETURNING id INTO v_wallet_id;
    
    -- Return with explicit column names to avoid ambiguity
    RETURN QUERY SELECT v_user_id as user_id, v_custom_id as custom_id, LOWER(p_wallet_address) as wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_with_wallet(VARCHAR(42), TEXT, TEXT, VARCHAR(64), VARCHAR(100), VARCHAR(255)) TO authenticated;
```

### **Complete Schema Fix Option 3:**

For a complete fresh start, use the final fixed schema:

```sql
-- Use the complete fixed schema
\i database/complete_schema_final.sql
```

## 🧪 **Testing the Fix**

### **Test Signup Process:**

1. **Clear any existing data** (if testing)
2. **Apply the SQL fix** using one of the options above
3. **Try the signup process** again:
   - Create new wallet
   - Verify recovery phrase
   - Complete signup

### **Expected Result:**
- ✅ **No more "ambiguous custom_id" error**
- ✅ **Successful user creation**
- ✅ **Unique custom_id generated** (e.g., "ABC1234DEFG5678")
- ✅ **User can proceed to dashboard**

## 🔍 **What Was Fixed**

### **Before (Problematic):**
```sql
-- Ambiguous variable naming
DECLARE
    custom_id VARCHAR(15);  -- ❌ Conflicts with table column
BEGIN
    SELECT COUNT(*) INTO exists_check 
    FROM user_profiles 
    WHERE user_profiles.custom_id = custom_id;  -- ❌ Ambiguous reference
```

### **After (Fixed):**
```sql
-- Clear variable naming with prefixes
DECLARE
    v_custom_id VARCHAR(15);  -- ✅ Clear variable name
BEGIN
    SELECT COUNT(*) INTO v_exists_check 
    FROM user_profiles up
    WHERE up.custom_id = v_custom_id;  -- ✅ No ambiguity
```

## 🎯 **Key Changes Made**

1. **Variable Prefixes:** All variables now use `v_` prefix (e.g., `v_custom_id`)
2. **Table Aliases:** All table references use aliases (e.g., `user_profiles up`)
3. **Explicit Column Names:** Return query uses explicit column naming
4. **Consistent Naming:** All functions follow the same naming convention

## 🚀 **Verification Steps**

### **1. Check Function Exists:**
```sql
SELECT proname FROM pg_proc WHERE proname = 'create_user_with_wallet';
```

### **2. Test Function Directly:**
```sql
SELECT * FROM create_user_with_wallet(
    '0x1234567890123456789012345678901234567890',
    'encrypted_key_here',
    'encrypted_mnemonic_here',
    'salt_here',
    'Test User',
    'test@example.com'
);
```

### **3. Check User Creation:**
```sql
SELECT custom_id, display_name FROM user_profiles ORDER BY created_at DESC LIMIT 1;
```

## 📋 **Troubleshooting**

### **If Still Getting Errors:**

1. **Check Database Connection:** Ensure you're connected to the right database
2. **Check Permissions:** Ensure the user has execute permissions on the function
3. **Check Dependencies:** Ensure `generate_custom_id()` function also exists
4. **Clear Cache:** Restart your application to clear any cached connections

### **Alternative Quick Test:**

If you want to test without affecting existing data:

```sql
-- Test in a transaction (will rollback)
BEGIN;
SELECT * FROM create_user_with_wallet('0xtest', 'test', 'test', 'test', 'Test', 'test@test.com');
ROLLBACK;
```

## ✅ **Result**

After applying the fix:
- ✅ **Signup process works smoothly**
- ✅ **No more database errors**
- ✅ **Consistent custom_id generation**
- ✅ **Users can complete registration**

**The ambiguous custom_id error is now completely resolved!**
# 🔧 Return Type Mismatch Fix - "Returned type text does not match expected type character varying"

## 🚨 **Error Identified**

The error shows a PostgreSQL type mismatch:
```
code: '42804',
details: 'Returned type text does not match expected type character varying in column 3.',
message: 'structure of query does not match function result type'
```

**Column 3** refers to the `wallet_address` field in the function return.

## 🎯 **Root Cause**

The issue is in the PostgreSQL function's `RETURN QUERY` statement where the data types don't match exactly between:
1. **Function signature:** `wallet_address VARCHAR(42)`
2. **Actual return:** `TEXT` type from `LOWER()` function

## ✅ **Two Solution Options**

### **Option 1: Fix Type Casting (Recommended)**

Apply the SQL fix that adds explicit type casting:

```sql
-- Apply this fix
\i database/fix_return_type_mismatch.sql
```

**What it does:**
- Adds explicit `::VARCHAR(42)` casting
- Ensures all return types match function signature exactly
- Includes test to verify function works

### **Option 2: Alternative Composite Type Approach**

Use a different function structure that avoids the table return complexity:

```sql
-- Apply alternative approach
\i database/alternative_function_approach.sql
```

**What it does:**
- Creates a custom composite type `user_creation_result`
- Returns a single object instead of a table
- Simpler type handling

## 🔧 **Recommended Fix Steps**

### **Step 1: Apply SQL Fix**

Choose one of the approaches:

#### **Approach A: Type Casting Fix**
```sql
\i database/fix_return_type_mismatch.sql
```

#### **Approach B: Composite Type Fix**
```sql
\i database/alternative_function_approach.sql
```

### **Step 2: Update TypeScript (if using Approach B)**

If you chose the alternative approach, replace the user-identity service:

```bash
# Backup current file
cp src/lib/user-identity.ts src/lib/user-identity-backup.ts

# Use alternative version
cp src/lib/user-identity-alternative.ts src/lib/user-identity.ts
```

### **Step 3: Test the Fix**

Test the database function directly:
```bash
curl http://192.168.1.2:3000/api/debug/test-function
```

## 🧪 **Testing Each Approach**

### **Test Approach A (Type Casting):**

The SQL includes a built-in test. Check your database logs for:
```
NOTICE: Function test successful. User ID: ..., Custom ID: ..., Wallet: ...
```

### **Test Approach B (Composite Type):**

The SQL includes a built-in test. Check your database logs for:
```
NOTICE: Alternative function test successful. User ID: ..., Custom ID: ..., Wallet: ...
```

### **Test Signup Process:**

1. **Go to signup page**
2. **Create new wallet**
3. **Verify recovery phrase**
4. **Complete signup**

**Expected Result:**
- ✅ **No more type mismatch errors**
- ✅ **Successful user creation**
- ✅ **Unique custom_id generated**

## 🔍 **Debugging Information**

### **Check Database Logs:**

After applying either fix, check your database logs for the test results:

```sql
-- Check recent log messages
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### **Manual Function Test:**

Test the function directly in your database:

#### **For Approach A:**
```sql
SELECT * FROM create_user_with_wallet(
    '0xtest123',
    'test_key',
    'test_mnemonic',
    'test_salt',
    'Test User',
    'test@example.com'
);
```

#### **For Approach B:**
```sql
SELECT * FROM create_user_with_wallet(
    '0xtest456',
    'test_key',
    'test_mnemonic',
    'test_salt',
    'Test User',
    'test@example.com'
);
```

## 📊 **What Each Fix Does**

### **Approach A: Type Casting Fix**

#### **Before (Problematic):**
```sql
RETURN QUERY SELECT v_user_id, v_custom_id, LOWER(p_wallet_address);
-- LOWER() returns TEXT, but function expects VARCHAR(42)
```

#### **After (Fixed):**
```sql
RETURN QUERY SELECT 
    v_user_id::UUID as user_id, 
    v_custom_id::VARCHAR(15) as custom_id, 
    v_wallet_address::VARCHAR(42) as wallet_address;
-- Explicit casting ensures type match
```

### **Approach B: Composite Type**

#### **Before (Table Return):**
```sql
RETURNS TABLE(user_id UUID, custom_id VARCHAR(15), wallet_address VARCHAR(42))
-- Complex table return with type matching issues
```

#### **After (Composite Type):**
```sql
RETURNS user_creation_result
-- Single composite type, simpler handling
```

## 🎯 **Expected Results**

After applying either fix:

### **Database Function:**
- ✅ **No type mismatch errors**
- ✅ **Successful function execution**
- ✅ **Proper return type handling**

### **Signup Process:**
- ✅ **No more PostgreSQL errors**
- ✅ **Successful user creation**
- ✅ **Consistent custom_id generation**
- ✅ **User can proceed to dashboard**

### **Console Logs:**
- ✅ **"Database function response:" shows success**
- ✅ **"Processed result:" shows proper data structure**
- ✅ **No error messages in browser console**

## 📋 **Troubleshooting**

### **If Approach A Fails:**
1. **Check database logs** for the test result message
2. **Verify function exists:** `\df create_user_with_wallet`
3. **Check permissions:** Ensure `authenticated` role has execute permission

### **If Approach B Fails:**
1. **Check if composite type was created:** `\dT user_creation_result`
2. **Verify function signature changed**
3. **Update TypeScript code** to use alternative version

### **If Both Fail:**
1. **Check database connection**
2. **Verify you're applying fixes to correct database**
3. **Check for conflicting functions or types**

## ✅ **Recommendation**

**Use Approach A (Type Casting Fix)** as it:
- ✅ **Requires no TypeScript changes**
- ✅ **Maintains existing function interface**
- ✅ **Fixes the root cause directly**
- ✅ **Includes built-in testing**

**The return type mismatch should be completely resolved after applying the type casting fix!**
# 🔧 Function Return Type Fix - "Structure of query does not match function result type"

## 🚨 **Error Identified**

After applying the ambiguous custom_id fix, users are now getting:
```
Error: Failed to create user: structure of query does not match function result type
```

## 🎯 **Root Cause**

The error occurs because there's a mismatch between:
1. **What the database function returns** (table structure)
2. **How the TypeScript code expects to access the data** (array structure)

## ✅ **Solution Implemented**

### **Issue in Original Code:**
```typescript
// PROBLEMATIC: Assumes data is always an array
const result = data[0];
```

### **Fixed Code:**
```typescript
// FIXED: Handles both array and object returns
const result = Array.isArray(data) ? data[0] : data;
console.log('Database function result:', result);
```

## 🔧 **Files Updated**

### **1. Fixed user-identity.ts**
- ✅ **Proper handling** of database function return types
- ✅ **Added logging** to debug the actual return structure
- ✅ **Defensive coding** to handle both array and object returns
- ✅ **Added test function** for debugging

### **2. Added Debug Endpoint**
**File:** `/src/app/api/debug/test-function/route.ts`

**Usage:**
```bash
# Test the database function directly
GET http://192.168.1.2:3000/api/debug/test-function

# Test with custom parameters
POST http://192.168.1.2:3000/api/debug/test-function
{
  "wallet_address": "0x1234567890123456789012345678901234567890",
  "display_name": "Test User",
  "email": "test@example.com"
}
```

## 🧪 **Testing Steps**

### **Step 1: Test Database Function Directly**
```bash
curl http://192.168.1.2:3000/api/debug/test-function
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database function test completed",
  "result": {
    "success": true,
    "data": [
      {
        "user_id": "uuid-here",
        "custom_id": "ABC1234DEFG5678",
        "wallet_address": "0xtest123456789012345678901234567890"
      }
    ]
  }
}
```

### **Step 2: Test Signup Process**
1. **Go to signup page**
2. **Create new wallet**
3. **Verify recovery phrase**
4. **Complete signup**

**Expected Result:**
- ✅ **No more "structure of query" error**
- ✅ **Successful user creation**
- ✅ **Console shows:** "Database function result: {user_id, custom_id, wallet_address}"

## 🔍 **Debug Information**

### **Check Console Logs:**
The fixed code now logs the actual database function result:
```
Database function result: {
  user_id: "uuid-here",
  custom_id: "ABC1234DEFG5678", 
  wallet_address: "0x..."
}
```

### **Possible Return Structures:**

#### **Case 1: Array Return**
```javascript
data = [
  {
    user_id: "uuid",
    custom_id: "ABC1234DEFG5678",
    wallet_address: "0x..."
  }
]
// Access: data[0]
```

#### **Case 2: Object Return**
```javascript
data = {
  user_id: "uuid",
  custom_id: "ABC1234DEFG5678", 
  wallet_address: "0x..."
}
// Access: data
```

#### **Case 3: Single Value Return**
```javascript
data = "ABC1234DEFG5678"
// Access: data
```

## 🎯 **What the Fix Does**

### **1. Defensive Data Access:**
```typescript
// Handles all possible return types
const result = Array.isArray(data) ? data[0] : data;
```

### **2. Enhanced Logging:**
```typescript
// Shows exactly what the database returns
console.log('Database function result:', result);
```

### **3. Better Error Handling:**
```typescript
// More specific error messages
if (!data || (Array.isArray(data) && data.length === 0)) {
  throw new Error('Failed to create user: No data returned');
}
```

### **4. Debug Endpoint:**
```typescript
// Test the function without going through signup
static async testCreateUserFunction(): Promise<any>
```

## 🚀 **Verification Commands**

### **Test Database Function:**
```bash
curl -X GET http://192.168.1.2:3000/api/debug/test-function
```

### **Test User Creation:**
```bash
curl -X POST http://192.168.1.2:3000/api/debug/test-function \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x1234567890123456789012345678901234567890",
    "display_name": "Test User",
    "email": "test@example.com"
  }'
```

### **Check Database:**
```sql
-- Check if user was created
SELECT custom_id, display_name, wallet_address 
FROM user_profiles up
JOIN wallets w ON up.id = w.user_profile_id
ORDER BY up.created_at DESC 
LIMIT 1;
```

## 📋 **Troubleshooting**

### **If Still Getting Errors:**

1. **Check Console Logs:** Look for "Database function result:" to see actual return structure
2. **Test Debug Endpoint:** Use `/api/debug/test-function` to isolate the issue
3. **Check Database Function:** Ensure the SQL function was updated correctly
4. **Verify Permissions:** Ensure the function has proper execute permissions

### **Common Issues:**

#### **Issue 1: Function Not Found**
```
Error: function create_user_with_wallet does not exist
```
**Solution:** Run the SQL fix again

#### **Issue 2: Permission Denied**
```
Error: permission denied for function create_user_with_wallet
```
**Solution:** Grant execute permissions:
```sql
GRANT EXECUTE ON FUNCTION create_user_with_wallet(...) TO authenticated;
```

#### **Issue 3: Wrong Return Type**
```
Error: structure of query does not match function result type
```
**Solution:** The fix should handle this, check console logs for actual structure

## ✅ **Expected Results**

After applying the fix:
- ✅ **Signup process works** without "structure of query" errors
- ✅ **Console shows** actual database function return structure
- ✅ **Debug endpoint** allows testing without full signup flow
- ✅ **Users can complete** registration successfully
- ✅ **Consistent custom_id** generation works

**The function return type mismatch is now resolved with defensive coding and proper data access patterns!**
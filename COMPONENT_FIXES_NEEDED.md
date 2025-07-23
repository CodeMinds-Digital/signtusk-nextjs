# Component Fixes for Signer ID Consistency

## 🎯 **Components That Need Updates**

The following components currently use `wallet.customId` instead of the authoritative `currentUser.custom_id`. They need to be updated to use the correct Signer ID.

### **1. DocumentSigning.tsx**
**Current Issue:**
```typescript
// ❌ Uses local wallet customId
const signerId = wallet.customId;
```

**Fix Needed:**
```typescript
// ✅ Use authoritative Signer ID
const { getSignerId } = useWallet();
const signerId = getSignerId();
```

### **2. EnhancedDocumentSigning.tsx**
**Current Issue:**
```typescript
// ❌ Multiple places using wallet.customId
signerName: documentMetadata.signerInfo || wallet.customId,
signerId: wallet.customId,
```

**Fix Needed:**
```typescript
// ✅ Use authoritative Signer ID
const { getSignerId } = useWallet();
const signerId = getSignerId();
signerName: documentMetadata.signerInfo || signerId,
signerId: signerId,
```

### **3. MultiSignature.tsx**
**Current Issue:**
```typescript
// ❌ Uses wallet.customId for initiator
initiatorId: wallet.customId,
```

**Fix Needed:**
```typescript
// ✅ Use authoritative Signer ID
const { getSignerId } = useWallet();
const signerId = getSignerId();
initiatorId: signerId,
```

### **4. Dashboard.tsx**
**Current Issue:**
```typescript
// ❌ Uses wallet.customId for search
if (searchId === wallet?.customId) {
```

**Fix Needed:**
```typescript
// ✅ Use authoritative Signer ID
const { getSignerId } = useWallet();
const signerId = getSignerId();
if (searchId === signerId) {
```

### **5. IntegratedDocumentSigning.tsx**
**Current Issue:**
```typescript
// ❌ Multiple uses of wallet.customId
const uploadPath = `documents/${wallet?.customId}/...`;
uploader_id: wallet?.customId,
```

**Fix Needed:**
```typescript
// ✅ Use authoritative Signer ID
const { getSignerId } = useWallet();
const signerId = getSignerId();
const uploadPath = `documents/${signerId}/...`;
uploader_id: signerId,
```

## 🔧 **Standard Fix Pattern**

For each component, apply this pattern:

### **Step 1: Import Updated Hook**
```typescript
import { useWallet } from '@/contexts/WalletContext-Updated';
```

### **Step 2: Get Authoritative Signer ID**
```typescript
const { getSignerId, currentUser, wallet } = useWallet();
const signerId = getSignerId();

// Add validation
if (!signerId) {
  // Handle case where no valid Signer ID is available
  console.error('No valid Signer ID available');
  return;
}
```

### **Step 3: Replace All Uses**
```typescript
// ❌ Replace all instances of:
wallet.customId
wallet?.customId

// ✅ With:
signerId
```

### **Step 4: Add Identity Consistency Check**
```typescript
const { identityConsistent, identityErrorMessage } = useWallet();

// Show warning if identity is inconsistent
if (!identityConsistent) {
  console.warn('Identity inconsistency detected:', identityErrorMessage);
}
```

## 📋 **Specific File Changes Needed**

### **1. src/components/DocumentSigning.tsx**
```typescript
// Line ~XX: Replace wallet.customId usage
const { getSignerId } = useWallet();
const signerId = getSignerId();

// Update signature data creation
const signatureData: SignatureData = {
  id: signatureRecord.id!,
  signerName: signerId,
  signerId: signerId,
  signature: signature,
  timestamp: new Date().toISOString()
};
```

### **2. src/components/EnhancedDocumentSigning.tsx**
```typescript
// Line ~XX: Replace wallet.customId usage
const { getSignerId } = useWallet();
const signerId = getSignerId();

// Update all signature-related code
signerName: documentMetadata.signerInfo || signerId,
signerId: signerId,
```

### **3. src/components/MultiSignature.tsx**
```typescript
// Line ~XX: Replace wallet.customId usage
const { getSignerId } = useWallet();
const signerId = getSignerId();

// Update multi-signature initiation
initiatorId: signerId,
```

### **4. src/components/Dashboard.tsx**
```typescript
// Line ~XX: Replace wallet.customId usage
const { getSignerId } = useWallet();
const signerId = getSignerId();

// Update search functionality
if (searchId === signerId) {
  setSearchResult({
    customId: signerId,
    address: wallet.address,
    found: true
  });
}
```

## 🧪 **Testing Checklist**

After applying fixes:

- [ ] **Sign a new document** - Verify Signer ID is consistent
- [ ] **Check Supabase folder** - Should use database custom_id
- [ ] **Check PDF signature** - Should show database custom_id
- [ ] **Verify document verification** - Should work with consistent ID
- [ ] **Test multi-signature** - Should use consistent initiator ID
- [ ] **Test dashboard search** - Should find user with correct ID

## 🚨 **Critical Files to Update First**

**Priority 1 (Most Critical):**
1. `DocumentSigning.tsx` - Core signing functionality
2. `EnhancedDocumentSigning.tsx` - Enhanced signing workflow

**Priority 2 (Important):**
3. `MultiSignature.tsx` - Multi-signature workflows
4. `IntegratedDocumentSigning.tsx` - Integrated workflows

**Priority 3 (Nice to Have):**
5. `Dashboard.tsx` - User interface consistency
6. Display components - Visual consistency

## 🔍 **Verification Commands**

After fixes, verify with these checks:

```bash
# Search for remaining wallet.customId usage
grep -r "wallet\.customId" src/components/

# Search for wallet?.customId usage  
grep -r "wallet\?\.customId" src/components/

# Verify getSignerId usage
grep -r "getSignerId" src/components/
```

## 📝 **Example Complete Fix**

Here's a complete example of how to fix a component:

```typescript
// ❌ Before (DocumentSigning.tsx)
export default function DocumentSigning() {
  const { wallet, currentUser } = useWallet();
  
  const handleSign = async () => {
    const uploadPath = `documents/${wallet.customId}/...`;
    const signatureData = {
      signerId: wallet.customId,
      signerName: wallet.customId
    };
  };
}

// ✅ After (DocumentSigning.tsx)
export default function DocumentSigning() {
  const { wallet, currentUser, getSignerId, identityConsistent } = useWallet();
  
  const handleSign = async () => {
    const signerId = getSignerId();
    
    if (!signerId) {
      alert('Unable to determine Signer ID. Please re-authenticate.');
      return;
    }
    
    if (!identityConsistent) {
      console.warn('Identity inconsistency detected - using database Signer ID');
    }
    
    const uploadPath = `documents/${signerId}/...`;
    const signatureData = {
      signerId: signerId,
      signerName: signerId
    };
  };
}
```

This ensures that all components use the same, authoritative Signer ID from the database! 🎉
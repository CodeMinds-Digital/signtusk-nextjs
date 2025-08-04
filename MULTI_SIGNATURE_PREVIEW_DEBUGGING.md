# Multi-Signature Preview Debugging Guide

## 🔍 **Current Implementation Status**

**Good News**: The frontend logic is **already correctly implemented** to show signed PDFs for completed multi-signature documents! 

### **✅ Frontend Logic (Already Correct)**:
```typescript
// Dashboard and Documents pages
if (document.status === 'completed' && document.signedUrl) {
  previewUrl = document.signedUrl;    // ✅ Uses signed_public_url
  window.open(document.signedUrl, '_blank');
} else if (document.metadata?.type === 'multi-signature') {
  router.push(`/multi-signature/verify/${multiSigRequestId}`);  // ✅ For pending docs
}
```

### **✅ API Response (Already Correct)**:
```typescript
// /api/documents/history already includes signed_public_url
signed_public_url: request.status === 'completed' ? request.documents?.signed_public_url : null,
```

### **✅ Data Mapping (Already Correct)**:
```typescript
// Frontend correctly maps API response
signedUrl: doc.signed_public_url,   // ✅ Maps signed_public_url to signedUrl
originalUrl: doc.public_url,        // ✅ Maps public_url to originalUrl
```

---

## 🔧 **Debugging Steps Added**

I've added enhanced debugging to help identify the issue:

### **Enhanced Dashboard Debugging**:
```typescript
// Debug logging for multi-signature documents
if (document.metadata?.type === 'multi-signature') {
  console.log('🔍 Multi-signature document preview debug:', {
    id: document.id,
    status: document.status,
    signedUrl: document.signedUrl,      // Should show signed PDF URL
    originalUrl: document.originalUrl,  // Should show original PDF URL
    metadata: document.metadata
  });
}
```

---

## 🧪 **How to Debug the Issue**

### **Step 1: Check Browser Console**
1. **Open Dashboard or Documents page**
2. **Open Browser DevTools** → Console tab
3. **Click on a completed multi-signature document**
4. **Look for debug logs** like:
   ```
   🔍 Multi-signature document preview debug: {
     id: "ms_abc123",
     status: "completed",
     signedUrl: "https://...signed.pdf",  // ← Should NOT be null
     originalUrl: "https://...original.pdf",
     metadata: { type: "multi-signature" }
   }
   ```

### **Step 2: Check API Response**
1. **Open Browser DevTools** → Network tab
2. **Refresh Dashboard/Documents page**
3. **Find `/api/documents/history` request**
4. **Check response** for multi-signature documents:
   ```json
   {
     "id": "ms_abc123",
     "status": "completed",
     "signed_public_url": "https://...signed.pdf"  // ← Should NOT be null
   }
   ```

### **Step 3: Check Database**
1. **Open Supabase Dashboard**
2. **Go to Table Editor** → `documents` table
3. **Find completed multi-signature documents**
4. **Check `signed_public_url` column** - should contain signed PDF URL

---

## 🎯 **Possible Issues & Solutions**

### **Issue 1: signed_public_url is null in database**
**Symptoms**: Console shows `signedUrl: null` for completed documents

**Solution**: Re-generate final PDF for affected documents:
```bash
# Call manual PDF generation API
POST /api/multi-signature/{id}/generate-final-pdf
```

### **Issue 2: PDF generation failed during completion**
**Symptoms**: Document status is "completed" but no signed_public_url

**Check**: Look for PDF generation errors in server logs:
```
❌ Storage error: [error details]
❌ Error generating multi-signature final PDF: [error details]
```

**Solution**: Fix PDF generation and re-run completion process

### **Issue 3: Old documents before signed_public_url was implemented**
**Symptoms**: Older completed documents missing signed_public_url

**Solution**: Batch regenerate PDFs for old documents:
```sql
-- Find documents missing signed_public_url
SELECT id, file_name, status, signed_public_url 
FROM documents 
WHERE status = 'completed' 
AND metadata->>'type' = 'multi-signature'
AND signed_public_url IS NULL;
```

---

## 🔧 **Manual Fix for Specific Documents**

If you find specific documents that aren't showing signed PDFs:

### **Option 1: Regenerate PDF via API**
```bash
# Replace {id} with the multi-signature request ID
curl -X POST "https://your-domain.com/api/multi-signature/{id}/generate-final-pdf"
```

### **Option 2: Check Multi-Signature Request Status**
```sql
-- Check if multi-signature request is properly completed
SELECT id, status, documents.signed_public_url
FROM multi_signature_requests
JOIN documents ON documents.id = multi_signature_requests.document_id
WHERE multi_signature_requests.id = 'your-request-id';
```

---

## 🎯 **Expected Behavior**

### **For Completed Multi-Signature Documents**:
```
✅ Console: "✅ Using signed PDF: https://...signed.pdf"
✅ Browser: Opens final signed PDF with all signatures
✅ PDF Content: Shows all signatures, QR codes, and completion info
```

### **For Pending Multi-Signature Documents**:
```
✅ Console: "🔄 Routing to multi-signature verification: {id}"
✅ Browser: Navigates to /multi-signature/verify/{id}
✅ Page: Shows signing progress and pending signers
```

---

## 🚀 **Next Steps**

1. **Test with debugging** - Check console logs when clicking documents
2. **Verify API response** - Ensure signed_public_url is not null
3. **Check specific documents** - Identify which documents are affected
4. **Regenerate PDFs if needed** - Use manual PDF generation API
5. **Report findings** - Share console logs and API responses for further diagnosis

The frontend code is already correct - the issue is likely in the data (missing signed_public_url values) rather than the preview logic itself.

---

## 🔍 **Quick Test**

**Try this in browser console on Dashboard/Documents page**:
```javascript
// Check all documents for signed URLs
documents.forEach(doc => {
  if (doc.metadata?.type === 'multi-signature' && doc.status === 'completed') {
    console.log(`Document ${doc.id}:`, {
      hasSignedUrl: !!doc.signedUrl,
      signedUrl: doc.signedUrl,
      status: doc.status
    });
  }
});
```

This will quickly show which completed multi-signature documents are missing signed URLs.

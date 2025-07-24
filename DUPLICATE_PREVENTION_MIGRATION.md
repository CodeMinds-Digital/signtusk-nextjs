# Migration Guide: Implementing Duplicate Document Prevention

## 🚀 **Quick Implementation Steps**

### **Step 1: Deploy Core Components**

**A. Copy the duplicate detection library:**
```bash
# Already created: src/lib/duplicate-document-checker.ts
# This provides all the duplicate detection logic
```

**B. Deploy enhanced upload API:**
```bash
# Already created: src/app/api/documents/upload-with-duplicate-check/route.ts
# This replaces or supplements your existing upload endpoint
```

**C. Add UI components:**
```bash
# Already created: 
# - src/components/DuplicateDocumentModal.tsx
# - src/components/DocumentUploadWithDuplicateCheck.tsx
```

### **Step 2: Update Existing Upload Components**

**Replace existing upload components with the enhanced version:**

```typescript
// Before (in your existing components)
import SomeUploadComponent from './SomeUploadComponent';

// After
import DocumentUploadWithDuplicateCheck from './DocumentUploadWithDuplicateCheck';

// Usage
<DocumentUploadWithDuplicateCheck
  onUploadSuccess={(document) => {
    // Handle successful upload
    console.log('Document uploaded:', document);
  }}
  onUploadError={(error) => {
    // Handle upload error
    console.error('Upload failed:', error);
  }}
/>
```

### **Step 3: Update API Endpoints (Optional)**

**Option A: Replace existing upload endpoint**
```bash
# Rename current upload route
mv src/app/api/documents/upload/route.ts src/app/api/documents/upload-old/route.ts

# Use new route as main upload
mv src/app/api/documents/upload-with-duplicate-check/route.ts src/app/api/documents/upload/route.ts
```

**Option B: Keep both endpoints**
```typescript
// Update frontend to use new endpoint
const uploadEndpoint = '/api/documents/upload-with-duplicate-check';
```

## 🔧 **Integration with Existing Components**

### **1. DocumentSigning.tsx Integration**

```typescript
// Add to existing DocumentSigning component
import DocumentUploadWithDuplicateCheck from './DocumentUploadWithDuplicateCheck';

export default function DocumentSigning() {
  const [currentDocument, setCurrentDocument] = useState(null);

  const handleUploadSuccess = (document) => {
    setCurrentDocument(document);
    // Continue with existing signing workflow
  };

  return (
    <div>
      {!currentDocument ? (
        <DocumentUploadWithDuplicateCheck
          onUploadSuccess={handleUploadSuccess}
          onUploadError={(error) => alert(error)}
        />
      ) : (
        // Existing signing UI
        <div>Document ready for signing...</div>
      )}
    </div>
  );
}
```

### **2. Dashboard Integration**

```typescript
// Add duplicate prevention to dashboard upload
import DocumentUploadWithDuplicateCheck from './DocumentUploadWithDuplicateCheck';

export default function Dashboard() {
  return (
    <div>
      <h2>Upload New Document</h2>
      <DocumentUploadWithDuplicateCheck
        onUploadSuccess={(document) => {
          // Refresh document list
          loadDocuments();
        }}
        className="mb-6"
      />
      {/* Rest of dashboard */}
    </div>
  );
}
```

## 🧪 **Testing the Implementation**

### **Test Scenario 1: First Upload**
1. Select a PDF file
2. Click upload
3. **Expected:** Upload succeeds normally
4. **Verify:** Document appears in database with `original_hash`

### **Test Scenario 2: Duplicate Upload (Same User)**
1. Select the same PDF file again
2. Click upload
3. **Expected:** Modal appears asking for confirmation
4. **User Action:** Click "Cancel"
5. **Verify:** Upload is cancelled, user can select different file

### **Test Scenario 3: Completed Document Reupload**
1. Complete a document signing workflow
2. Try to upload the same PDF again
3. **Expected:** Modal blocks upload with message about completion
4. **User Action:** Must click "OK" and select different file

### **Test Scenario 4: Force Upload**
1. Upload a document that was previously rejected
2. **Expected:** Modal asks for confirmation
3. **User Action:** Click "Continue Anyway"
4. **Verify:** Upload proceeds with `force_upload: true` in metadata

## 📋 **Configuration Options**

### **Customize Duplicate Behavior**

Edit `src/lib/duplicate-document-checker.ts`:

```typescript
// Modify these constants to change behavior
const ALLOW_MULTIPLE_WORKFLOWS = false; // Set to true to allow multiple workflows
const SHOW_DETAILED_INFO = true; // Set to false to hide document details
const ENABLE_FORCE_UPLOAD = true; // Set to false to disable force upload
```

### **Customize UI Messages**

Edit `src/components/DuplicateDocumentModal.tsx`:

```typescript
// Customize messages in the getTitle() and message display functions
const getTitle = () => {
  switch (action) {
    case 'block':
      return 'Document Already Processed'; // Customize this
    case 'confirm':
      return 'Duplicate Document Found'; // Customize this
    // ...
  }
};
```

## 🔍 **Monitoring & Debugging**

### **Check Duplicate Detection Logs**

```typescript
// Add to your logging system
console.log('Duplicate check result:', {
  isDuplicate: result.isDuplicate,
  action: result.action,
  documentHash: hash,
  userId: currentUser?.custom_id
});
```

### **Database Queries for Monitoring**

```sql
-- Check for documents with same hash
SELECT 
  original_hash,
  COUNT(*) as duplicate_count,
  array_agg(file_name) as file_names,
  array_agg(status) as statuses
FROM documents 
GROUP BY original_hash 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check force upload usage
SELECT 
  COUNT(*) as force_uploads,
  COUNT(*) FILTER (WHERE metadata->>'force_upload' = 'true') as forced_count
FROM documents
WHERE created_at >= NOW() - INTERVAL '30 days';
```

## 🚨 **Rollback Plan**

If you need to rollback the changes:

### **Step 1: Restore Original Upload**
```bash
# If you replaced the original upload route
mv src/app/api/documents/upload-old/route.ts src/app/api/documents/upload/route.ts
```

### **Step 2: Update Components**
```typescript
// Revert to original upload components
// Remove DocumentUploadWithDuplicateCheck imports
// Restore original upload component usage
```

### **Step 3: Database Cleanup (if needed)**
```sql
-- Remove force_upload metadata if needed
UPDATE documents 
SET metadata = metadata - 'force_upload'
WHERE metadata ? 'force_upload';
```

## ✅ **Success Criteria**

After implementation, verify:

- [ ] **No duplicate uploads** for completed documents
- [ ] **User confirmation** required for potential duplicates
- [ ] **Clear messaging** about why uploads are blocked
- [ ] **Existing workflows** continue to work normally
- [ ] **Performance** remains acceptable
- [ ] **Error handling** works for edge cases

## 🎯 **Expected Results**

### **Immediate Benefits:**
- ✅ Users can't accidentally upload completed documents
- ✅ Clear guidance when duplicates are detected
- ✅ Reduced storage usage from prevented duplicates
- ✅ Better user experience with clear messaging

### **Long-term Benefits:**
- ✅ Cleaner database with fewer duplicate records
- ✅ Reduced support requests about duplicate documents
- ✅ Better compliance with document management standards
- ✅ Improved system performance

## 📞 **Support & Troubleshooting**

### **Common Issues:**

**1. Hash generation fails:**
- Check that `generateDocumentHashServer` is working
- Verify file is valid PDF
- Check server-side crypto module

**2. Modal doesn't appear:**
- Verify duplicate detection API is responding
- Check browser console for JavaScript errors
- Ensure modal component is properly imported

**3. Force upload doesn't work:**
- Check that `forceUpload` parameter is being sent
- Verify API route handles force upload flag
- Check database for force upload metadata

The duplicate prevention system is now ready for deployment! 🎉
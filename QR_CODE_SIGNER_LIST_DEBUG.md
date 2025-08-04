# QR Code and Signer List Debug Guide

## 🔍 **Issue Identified**

**Problem**: QR code and signer list are not appearing in the final multi-signature PDF, leaving empty white space where they should be.

**Possible Causes**:
1. **QR code generation failure** - QR code creation or embedding fails silently
2. **Signer data issues** - Signer information not properly passed or formatted
3. **PDF positioning errors** - Elements drawn outside visible area
4. **Image embedding problems** - PNG conversion or embedding fails

---

## 🔧 **Debugging Added**

I've added comprehensive debugging to identify the root cause:

### **1. QR Code Generation Debugging**:
```typescript
// In generateMultiSignatureQRCode function:
console.log('🔄 Generating QR code for multi-signature request ID:', multiSignatureRequestId);
console.log('🔄 QR data created:', qrData);
console.log('✅ QR code generated successfully, data URL length:', qrCodeDataURL.length);
```

### **2. QR Code Embedding Debugging**:
```typescript
// In PDF generation:
console.log('🔄 Generating QR code for multi-signature request:', multiSigRequest.id);
console.log('✅ QR code generated, data URL length:', qrCodeDataURL.length);
console.log('🔄 Converting QR code to bytes, base64 length:', base64Data.length);
console.log('✅ QR code bytes created, length:', qrCodeBytes.length);
console.log('🔄 Embedding QR code as PNG...');
console.log('✅ QR code embedded successfully');
console.log('🔄 Drawing QR code at position:', { x: originalWidth + 10, y: 25 });
console.log('✅ QR code drawn successfully');
```

### **3. Signer Data Debugging**:
```typescript
// Main function input:
console.log('👥 Signers data:', signers.map(s => ({
  id: s.id,
  signerCustomId: s.signerCustomId,
  status: s.status,
  signingOrder: s.signingOrder,
  signedAt: s.signedAt
})));

// Bottom signatures:
console.log('🔄 Adding bottom signatures:', bottomSignatures.length);
console.log('🔄 Processing bottom signer:', { signerCustomId, status, signedAt });

// Right side signatures:
console.log('🔄 Adding right side signatures:', rightSignatures.length);
console.log('🔄 Processing right side signer:', { signerCustomId, status, signedAt });
```

---

## 🧪 **How to Debug**

### **Step 1: Check Console Logs**
1. **Complete a multi-signature document** (all signers sign)
2. **Open Browser DevTools** → Console tab
3. **Look for debug messages** during PDF generation:

**Expected Success Flow**:
```
🔄 Starting multi-signature final PDF generation
📄 Document: { id: "...", file_name: "contract.pdf" }
👥 Signers data: [{ signerCustomId: "USER123", status: "signed", ... }]
📄 Processing 3 pages for multi-signature final PDF
🔄 Adding bottom signatures: 2
🔄 Processing bottom signer 1: { signerCustomId: "USER123", status: "signed" }
🔄 Adding right side signatures: 1
🔄 Processing right side signer 1: { signerCustomId: "USER456", status: "signed" }
🔄 Generating QR code for multi-signature request: abc123
✅ QR code generated successfully, data URL length: 1234
🔄 Converting QR code to bytes, base64 length: 890
✅ QR code embedded successfully
✅ QR code drawn successfully
✅ QR code and text added successfully to page
```

**Error Indicators to Watch For**:
```
❌ Error generating multi-signature QR code: [error]
❌ Failed to generate QR code: [error]
❌ Invalid QR code data URL format
❌ No base64 data found in QR code data URL
```

### **Step 2: Check Signer Data**
Look for the signers data log:
```javascript
// Should show complete signer information:
👥 Signers data: [
  {
    id: "signer1",
    signerCustomId: "USER123",  // ← Should not be null/undefined
    status: "signed",           // ← Should be "signed" for completed docs
    signingOrder: 0,           // ← Should be valid numbers
    signedAt: "2023-12-15T..."  // ← Should have timestamp for signed
  }
]
```

### **Step 3: Check QR Code Generation**
Look for QR code generation logs:
```javascript
// Should show successful QR generation:
🔄 Generating QR code for multi-signature request ID: abc123
🔄 QR data created: MS:abc123
✅ QR code generated successfully, data URL length: 1234
🔍 QR code data URL preview: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

---

## 🎯 **Common Issues & Solutions**

### **Issue 1: Empty Signer Data**
**Symptoms**: 
```
👥 Signers data: []
🔄 Adding bottom signatures: 0
🔄 Adding right side signatures: 0
```

**Solution**: Check multi-signature request completion - signers data not properly fetched

### **Issue 2: QR Code Generation Failure**
**Symptoms**:
```
❌ Error generating multi-signature QR code: [error details]
❌ Failed to generate QR code: [error details]
```

**Solution**: Check QRCode library installation and multi-signature request ID validity

### **Issue 3: Invalid Signer Properties**
**Symptoms**:
```
🔄 Processing bottom signer 1: { signerCustomId: undefined, status: undefined }
```

**Solution**: Check database query - signer properties not properly mapped from snake_case to camelCase

### **Issue 4: PDF Positioning Issues**
**Symptoms**: No errors but elements not visible

**Check**: PDF viewer zoom level and page dimensions
- QR code position: `x: originalWidth + 10, y: 25`
- Bottom signatures: `y: 10` to `y: 90`
- Right signatures: `x: originalWidth + 10`

---

## 🔧 **Manual Testing Steps**

### **Test QR Code Generation Separately**:
```javascript
// Test in browser console:
import { generateMultiSignatureQRCode } from './lib/multi-signature-pdf';

generateMultiSignatureQRCode('test-request-id')
  .then(dataUrl => {
    console.log('QR Code generated:', dataUrl.length);
    // Create image element to verify
    const img = document.createElement('img');
    img.src = dataUrl;
    document.body.appendChild(img);
  })
  .catch(err => console.error('QR generation failed:', err));
```

### **Test Signer Data**:
```javascript
// Check API response:
fetch('/api/multi-signature/[id]/signers')
  .then(res => res.json())
  .then(data => {
    console.log('Signers from API:', data);
    // Verify all required properties exist
  });
```

---

## 🎯 **Expected PDF Output**

### **Bottom Area (First 3 Signers)**:
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Multi-Sig: USER1│ │ Multi-Sig: USER2│ │ Multi-Sig: USER3│
│ SIGNED          │ │ SIGNED          │ │ PENDING         │
│ 12/15/2023      │ │ 12/16/2023      │ │ Pending         │
│ Order: 1        │ │ Order: 2        │ │ Order: 3        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### **Right Side (Additional Signers)**:
```
┌─────┐
│USER4│ (rotated 90°)
│SIGN │
│12/17│
└─────┘
┌─────┐
│USER5│
│PEND │
│Pend │
└─────┘
```

### **Bottom Right Corner (QR Code)**:
```
┌──────────────┐
│ ████ ████ ██ │ ← QR Code
│ ██ ████ ████ │
│ ████ ██ ████ │
│ Multi-Sig    │
│ Scan to Verify│
└──────────────┘
```

---

## 🚀 **Next Steps**

1. **Complete a multi-signature document** with all signers
2. **Check browser console** during PDF generation
3. **Look for the debug messages** listed above
4. **Identify which step is failing**:
   - Signer data loading
   - QR code generation
   - PDF embedding
   - Element positioning

5. **Share the console logs** for further diagnosis

The debugging will help pinpoint exactly where the process is failing and why the QR code and signer list aren't appearing in the final PDF.

---

## 🔍 **Quick Diagnostic Commands**

**Check if QRCode library is working**:
```bash
npm list qrcode
```

**Test QR generation manually**:
```javascript
// In browser console
QRCode.toDataURL('test-data').then(console.log).catch(console.error);
```

**Check PDF dimensions**:
```javascript
// Look for page size logs
📄 Processing 3 pages for multi-signature final PDF
Page 1: Processing multi-signature signatures
```

The comprehensive debugging will reveal exactly what's happening during the PDF generation process!

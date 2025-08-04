# QR Code and Signer List Blank - Comprehensive Troubleshooting

## 🔍 **Issue Status**

**Problem**: QR code and signer list are still appearing as blank/empty white space in the final signed PDF despite debugging being added.

**Possible Root Causes**:
1. **QR Code Library Issue** - QRCode npm package not working properly
2. **Data Structure Problem** - Signer data not properly formatted or passed
3. **PDF Positioning Issue** - Elements drawn outside visible PDF area
4. **Font Loading Issue** - Fonts not properly embedded
5. **Async/Await Issue** - QR generation not completing before PDF creation

---

## 🧪 **Step-by-Step Debugging Process**

### **Step 1: Test QR Code Generation Independently**

I've created a test endpoint to verify QR code generation works:

**Test QR Generation**:
```bash
# Test basic QR generation
curl http://localhost:3000/api/test/qr-generation

# Test with custom ID
curl -X POST http://localhost:3000/api/test/qr-generation \
  -H "Content-Type: application/json" \
  -d '{"requestId": "your-multi-sig-request-id"}'
```

**Or test in browser**:
- Visit: `http://localhost:3000/api/test/qr-generation`
- Should show a QR code image if generation works
- If it fails, you'll see error details

### **Step 2: Check Console Logs During PDF Generation**

Complete a multi-signature document and look for these specific logs:

**Expected Success Flow**:
```
🔄 Starting multi-signature final PDF generation
👥 Signers data: [{ signerCustomId: "USER123", status: "signed", ... }]
📄 Processing 3 pages for multi-signature final PDF
🔄 Adding bottom signatures: 2
🔄 Processing bottom signer 1: { signerCustomId: "USER123", status: "signed" }
🔄 Drawing bottom signature text at position: { x: 12, y: 70 }
✅ Bottom signer 1 drawn successfully
🔄 Generating QR code for multi-signature request: abc123
🔄 QR data created: MS:abc123
🔄 Calling QRCode.toDataURL...
✅ QR code generated successfully, data URL length: 1234
🔄 Converting QR code to bytes, base64 length: 890
✅ QR code embedded successfully
✅ QR code drawn successfully
```

**Error Indicators**:
```
❌ Error generating multi-signature QR code: [details]
❌ QRCode library not available
❌ Invalid multi-signature request ID
❌ Generated QR code is not a valid PNG data URL
```

### **Step 3: Check Signer Data Structure**

Look for the signer data log and verify:
```javascript
👥 Signers data: [
  {
    id: "signer1",
    signerCustomId: "USER123",  // ← Must not be null/undefined
    status: "signed",           // ← Must be "signed" for completed docs
    signingOrder: 0,           // ← Must be valid number
    signedAt: "2023-12-15T..."  // ← Should have timestamp
  }
]
```

**Common Issues**:
- `signerCustomId: undefined` → Database mapping issue
- `status: undefined` → Status not properly set
- Empty array `[]` → Signers not fetched correctly

---

## 🔧 **Manual Fixes to Try**

### **Fix 1: Force Fallback Stamp (Test if positioning works)**

Temporarily force the fallback stamp to always show:

```typescript
// In multi-signature-pdf.ts, replace the QR code try block with:
try {
  // Force fallback for testing
  throw new Error('Testing fallback stamp');
  
  // ... rest of QR code generation
} catch (qrError) {
  // Fallback stamp should appear
}
```

If the fallback stamp appears, the issue is QR code generation. If not, it's positioning.

### **Fix 2: Simplify QR Code Generation**

Replace the QR code generation with a simple test:

```typescript
// In generateMultiSignatureQRCode function:
export async function generateMultiSignatureQRCode(multiSignatureRequestId: string): Promise<string> {
  // Return a simple test QR code
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
}
```

### **Fix 3: Check PDF Viewer**

The issue might be with the PDF viewer:
1. **Download the PDF** instead of viewing in browser
2. **Open with different PDF viewer** (Adobe Reader, Preview, etc.)
3. **Check different zoom levels** (100%, 75%, 150%)
4. **Print preview** to see if elements appear

### **Fix 4: Add Visible Test Elements**

Add highly visible test elements to verify positioning:

```typescript
// Add this after the QR code section:
page.drawRectangle({
  x: originalWidth,
  y: 0,
  width: 100,
  height: 100,
  color: rgb(1, 0, 0), // Bright red
  borderColor: rgb(0, 0, 0),
  borderWidth: 5,
});

page.drawText('TEST STAMP', {
  x: originalWidth + 10,
  y: 50,
  font: titleFont,
  size: 12,
  color: rgb(1, 1, 1), // White text
});
```

---

## 🎯 **Specific Tests to Run**

### **Test 1: QR Code Library**
```bash
# Check if QRCode is installed
npm list qrcode

# If not installed:
npm install qrcode
npm install @types/qrcode
```

### **Test 2: Browser Console Test**
```javascript
// Run in browser console on any page:
import('qrcode').then(QRCode => {
  QRCode.toDataURL('test-data', {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H'
  }).then(dataUrl => {
    console.log('QR Code generated:', dataUrl.length);
    const img = document.createElement('img');
    img.src = dataUrl;
    document.body.appendChild(img);
  }).catch(err => {
    console.error('QR generation failed:', err);
  });
});
```

### **Test 3: PDF Dimensions**
Check if the PDF is being created with the right dimensions:
```
📄 Processing 3 pages for multi-signature final PDF
Page 1: Processing multi-signature signatures
Original dimensions: width=595, height=842
New dimensions: width=695, height=942
QR position: x=605, y=25 (should be visible)
```

---

## 🚨 **Emergency Workaround**

If QR code generation continues to fail, implement a simple text-based verification:

```typescript
// Replace QR code section with:
page.drawText('MULTI-SIGNATURE', {
  x: originalWidth + 10,
  y: 80,
  font: titleFont,
  size: 8,
  color: rgb(0, 0, 0.8),
});

page.drawText('DOCUMENT', {
  x: originalWidth + 25,
  y: 65,
  font: titleFont,
  size: 8,
  color: rgb(0, 0, 0.8),
});

page.drawText(`ID: ${multiSigRequest.id}`, {
  x: originalWidth + 5,
  y: 50,
  font: textFont,
  size: 6,
  color: rgb(0, 0, 0),
});

page.drawText('Scan QR at:', {
  x: originalWidth + 5,
  y: 35,
  font: textFont,
  size: 6,
  color: rgb(0, 0, 0),
});

page.drawText('/verify/multi-sig', {
  x: originalWidth + 5,
  y: 20,
  font: textFont,
  size: 6,
  color: rgb(0, 0, 0),
});
```

---

## 🔍 **Next Steps**

1. **Run the QR test endpoint** first: `/api/test/qr-generation`
2. **Check console logs** during PDF generation
3. **Try the manual fixes** above one by one
4. **Share the specific error messages** you see in console
5. **Test with different PDF viewers** to rule out display issues

The comprehensive debugging should reveal exactly where the process is failing. Please run these tests and share the console output!

---

## 📋 **Checklist**

- [ ] QR test endpoint works (`/api/test/qr-generation`)
- [ ] Console shows signer data is not empty
- [ ] Console shows QR code generation succeeds
- [ ] Console shows PDF positioning logs
- [ ] Fallback stamp appears when QR fails
- [ ] Test elements (red rectangle) are visible
- [ ] Different PDF viewers show same result
- [ ] Downloaded PDF vs browser preview comparison

Complete this checklist to systematically identify the issue!

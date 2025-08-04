import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export interface MultiSignatureData {
  id: string;
  signerCustomId: string;
  signingOrder: number;
  status: 'pending' | 'signed' | 'rejected';
  signature?: string;
  signedAt?: string;
  signatureMetadata?: any;
}

export interface MultiSignatureRequestData {
  id: string;
  status: string;
  description?: string;
  initiatorCustomId: string;
  createdAt: string;
  completedAt?: string;
  signingType: string;
  documentHash: string;
  signers: MultiSignatureData[];
}

/**
 * Create QR code data for multi-signature document verification
 * @param multiSignatureRequestId - The multi-signature request ID
 * @returns QR code data string containing the multi-signature request ID
 */
export function createMultiSignatureQRData(multiSignatureRequestId: string): string {
  // QR code contains the multi-signature request ID
  // When scanned, the app will construct the verification URL: /api/verify/multi-signature/{id}
  return `MS:${multiSignatureRequestId}`;
}

/**
 * Generate QR code as PNG data URL for multi-signature documents
 * @param multiSignatureRequestId - Multi-signature request ID to encode
 * @returns Promise that resolves to PNG data URL
 */
export async function generateMultiSignatureQRCode(multiSignatureRequestId: string): Promise<string> {
  try {
    console.log('🔄 Generating QR code for multi-signature request ID:', multiSignatureRequestId);

    // Validate input
    if (!multiSignatureRequestId || multiSignatureRequestId.trim() === '') {
      throw new Error('Invalid multi-signature request ID');
    }

    const qrData = createMultiSignatureQRData(multiSignatureRequestId);
    console.log('🔄 QR data created:', qrData);

    // Test if QRCode library is available
    if (typeof QRCode === 'undefined') {
      throw new Error('QRCode library not available');
    }

    console.log('🔄 Calling QRCode.toDataURL...');

    // Use more robust QR code generation settings
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' // Changed from 'H' to 'M' for better compatibility
    });

    console.log('✅ QR code generated successfully, data URL length:', qrCodeDataURL.length);
    console.log('🔍 QR code data URL preview:', qrCodeDataURL.substring(0, 100) + '...');

    // Validate the generated data URL
    if (!qrCodeDataURL || !qrCodeDataURL.includes('data:image/png;base64,')) {
      throw new Error('Generated QR code is not a valid PNG data URL');
    }

    // Additional validation - check if base64 data exists
    const base64Part = qrCodeDataURL.split(',')[1];
    if (!base64Part || base64Part.length < 100) {
      throw new Error('QR code base64 data is too short or missing');
    }

    return qrCodeDataURL;
  } catch (error) {
    console.error('❌ Error generating multi-signature QR code:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack : undefined);
    throw new Error(`Failed to generate multi-signature QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a signed PDF with multi-signature stamp
 * @param originalFile - Original PDF file
 * @param multiSignatureData - Multi-signature request data
 * @returns Promise that resolves to signed PDF blob
 */
export async function generateMultiSignaturePDF(
  originalFile: File,
  multiSignatureData: MultiSignatureRequestData
): Promise<Blob> {
  try {
    // Read the original PDF
    const originalBytes = await originalFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });

    // Get the last page to add signature stamp
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Calculate stamp dimensions and position
    const stampWidth = 180;
    const stampHeight = 120;
    const stampX = width - stampWidth - 20;
    const stampY = 20;

    // Create signature stamp background
    lastPage.drawRectangle({
      x: stampX,
      y: stampY,
      width: stampWidth,
      height: stampHeight,
      borderColor: rgb(0, 0, 0.8),
      borderWidth: 2,
      color: rgb(0.95, 0.95, 1),
    });

    // Embed fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add title
    lastPage.drawText('DIGITALLY SIGNED', {
      x: stampX + 10,
      y: stampY + stampHeight - 20,
      font: titleFont,
      size: 12,
      color: rgb(0, 0, 0.8),
    });

    // Add multi-signature info
    const completedSigners = multiSignatureData.signers.filter(s => s.status === 'signed');
    const totalSigners = multiSignatureData.signers.length;

    lastPage.drawText(`Multi-Signature Document`, {
      x: stampX + 10,
      y: stampY + stampHeight - 40,
      font: textFont,
      size: 9,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(`${completedSigners.length} of ${totalSigners} signatures`, {
      x: stampX + 10,
      y: stampY + stampHeight - 55,
      font: textFont,
      size: 9,
      color: rgb(0, 0, 0),
    });

    // Add completion date if fully signed
    if (multiSignatureData.status === 'completed' && multiSignatureData.completedAt) {
      const completedDate = new Date(multiSignatureData.completedAt).toLocaleDateString();
      lastPage.drawText(`Completed: ${completedDate}`, {
        x: stampX + 10,
        y: stampY + stampHeight - 70,
        font: textFont,
        size: 8,
        color: rgb(0, 0, 0),
      });
    }

    // Generate and embed QR code
    try {
      const qrCodeDataURL = await generateMultiSignatureQRCode(multiSignatureData.id);

      // Convert data URL to bytes
      const qrCodeBytes = Uint8Array.from(
        atob(qrCodeDataURL.split(',')[1]),
        c => c.charCodeAt(0)
      );

      // Embed QR code image
      const qrImage = await pdfDoc.embedPng(qrCodeBytes);

      // Draw QR code
      lastPage.drawImage(qrImage, {
        x: stampX + stampWidth - 90,
        y: stampY + 10,
        width: 80,
        height: 80,
      });

      // Add QR code label
      lastPage.drawText('Scan to Verify', {
        x: stampX + stampWidth - 85,
        y: stampY + 5,
        font: textFont,
        size: 7,
        color: rgb(0, 0, 0.8),
      });

    } catch (qrError) {
      console.error('Error adding QR code to PDF:', qrError);
      // Continue without QR code if generation fails
    }

    // Add signer information (abbreviated)
    let yOffset = stampY + 45;
    const maxSignersToShow = 3;
    const signersToShow = multiSignatureData.signers
      .sort((a, b) => a.signingOrder - b.signingOrder)
      .slice(0, maxSignersToShow);

    signersToShow.forEach((signer, index) => {
      const statusIcon = signer.status === 'signed' ? '[SIGNED]' : '[PENDING]';
      const statusColor = signer.status === 'signed' ? rgb(0, 0.6, 0) : rgb(0.6, 0.6, 0.6);

      lastPage.drawText(`${statusIcon} ${signer.signerCustomId}`, {
        x: stampX + 10,
        y: yOffset - (index * 12),
        font: textFont,
        size: 7,
        color: statusColor,
      });
    });

    // Add "and X more" if there are more signers
    if (multiSignatureData.signers.length > maxSignersToShow) {
      const remainingCount = multiSignatureData.signers.length - maxSignersToShow;
      lastPage.drawText(`... and ${remainingCount} more`, {
        x: stampX + 10,
        y: yOffset - (maxSignersToShow * 12),
        font: textFont,
        size: 7,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });

  } catch (error) {
    console.error('Error generating multi-signature PDF:', error);
    throw new Error('Failed to generate multi-signature PDF');
  }
}

/**
 * Download multi-signature PDF
 * @param pdfBlob - PDF blob to download
 * @param fileName - Name for the downloaded file
 */
export function downloadMultiSignaturePDF(pdfBlob: Blob, fileName: string): void {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.replace(/\.pdf$/i, '') + '_multi_signed.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create a verification URL for multi-signature documents
 * @param multiSignatureRequestId - Multi-signature request ID
 * @param baseUrl - Base URL of the application
 * @returns Verification URL
 */
export function createMultiSignatureVerificationURL(
  multiSignatureRequestId: string,
  baseUrl: string = ''
): string {
  return `${baseUrl}/multi-signature/verify/${multiSignatureRequestId}`;
}

/**
 * Generate final signed PDF for completed multi-signature document
 * @param params - Document, multi-signature request, and signers data
 * @returns Promise that resolves to signed PDF URL and file path
 */
export async function generateMultiSignatureFinalPDF(params: {
  document: any;
  multiSigRequest: any;
  signers: MultiSignatureData[];
}): Promise<{ publicUrl: string; filePath: string }> {
  try {
    const { document, multiSigRequest, signers } = params;

    console.log('🔄 Starting multi-signature final PDF generation');
    console.log('📄 Document:', { id: document.id, file_name: document.file_name });
    console.log('📋 Multi-signature request:', { id: multiSigRequest.id, status: multiSigRequest.status });
    console.log('👥 Signers data:', signers.map(s => ({
      id: s.id,
      signerCustomId: s.signerCustomId,
      status: s.status,
      signingOrder: s.signingOrder,
      signedAt: s.signedAt
    })));

    // Download the original PDF
    const response = await fetch(document.public_url);
    if (!response.ok) {
      throw new Error('Failed to download original document');
    }

    const originalPdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });

    // Process each page to add signature areas (like single signature)
    const pages = pdfDoc.getPages();
    console.log(`📄 Processing ${pages.length} pages for multi-signature final PDF`);

    // Process each page to add signature information
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      console.log(`Page ${pageIndex + 1}: Processing multi-signature signatures`);

      // Create a new page with expanded dimensions for signatures (like single signature)
      const newPage = pdfDoc.insertPage(pageIndex, [width + 100, height + 100]);

      // Draw signature areas with light gray background
      // Bottom rectangle for signatures
      newPage.drawRectangle({
        x: 0,
        y: 0,
        width: width + 100,
        height: 100,
        color: rgb(0.95, 0.95, 0.95) // Light gray
      });

      // Right rectangle for additional signatures
      newPage.drawRectangle({
        x: width,
        y: 100,
        width: 100,
        height: height,
        color: rgb(0.95, 0.95, 0.95) // Light gray
      });

      // Embed the original page content
      const embeddedPage = await pdfDoc.embedPage(page);

      // Draw the original page content on the new page, positioned to leave space for signatures
      newPage.drawPage(embeddedPage, {
        x: 0,
        y: 100,
        width: width,
        height: height,
      });

      // Add multi-signature information to this page
      await addMultiSignatureInfoToPage(pdfDoc, newPage, signers, multiSigRequest, width, height, pageIndex);

      // Remove the original page
      pdfDoc.removePage(pageIndex + 1);
    }

    // Save the PDF
    const finalPdfBytes = await pdfDoc.save();
    console.log('📄 Multi-signature PDF generated, size:', finalPdfBytes.length, 'bytes');

    // Create blob from PDF bytes
    const signedPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });







    // Use admin client for server-side upload (same as multi-signature creation)
    try {
      const { uploadBlobAsAdmin } = await import('@/lib/supabase-admin');

      // Create a unique filename following the same pattern as single signature
      const signedFileName = `multi-signature-signed-${multiSigRequest.id}-${Date.now()}.pdf`;
      const filePath = `multi-signature/${multiSigRequest.initiator_custom_id}/${signedFileName}`;

      console.log('📤 Uploading signed PDF to storage:', filePath);

      // Upload using admin client (bypasses RLS like multi-signature creation)
      const uploadResult = await uploadBlobAsAdmin(
        signedPdfBlob,
        'documents',
        filePath,
        'application/pdf'
      );

      if (uploadResult.error) {
        console.error('❌ Error uploading signed PDF:', uploadResult.error);
        throw new Error(`Failed to upload signed PDF: ${uploadResult.error.message || 'Unknown error'}`);
      }

      console.log('✅ Signed PDF uploaded successfully:', uploadResult.data);
      console.log('🔗 Signed PDF public URL:', uploadResult.publicUrl);

      return {
        publicUrl: uploadResult.publicUrl!,
        filePath: filePath
      };

    } catch (storageError) {
      console.error('❌ Storage error:', storageError);
      throw new Error(`Failed to store signed PDF: ${storageError instanceof Error ? storageError.message : 'Unknown storage error'}`);
    }

  } catch (error) {
    console.error('Error generating multi-signature final PDF:', error);
    throw new Error('Failed to generate final signed PDF');
  }
}

/**
 * Add multi-signature information to a PDF page (like single signature)
 */
async function addMultiSignatureInfoToPage(
  pdfDoc: PDFDocument,
  page: any,
  signers: MultiSignatureData[],
  multiSigRequest: any,
  originalWidth: number,
  originalHeight: number,
  pageIndex: number
): Promise<void> {
  try {
    // Embed fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const smallFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const padding = 12;
    const newWidth = originalWidth + 100;
    const newHeight = originalHeight + 100;

    // Add signatures to bottom area (like single signature)
    let currentX = padding;
    const bottomSignatures = signers.slice(0, Math.min(signers.length, 3));
    console.log('🔄 Adding bottom signatures:', bottomSignatures.length);

    bottomSignatures.forEach((signer, index) => {
      console.log(`🔄 Processing bottom signer ${index + 1}:`, {
        signerCustomId: signer.signerCustomId,
        status: signer.status,
        signedAt: signer.signedAt
      });
      const signatureWidth = textFont.widthOfTextAtSize(signer.signerCustomId, 12) + 2 * padding;

      // Check if signature fits in remaining space
      if (currentX + signatureWidth > originalWidth - padding) {
        return;
      }

      const signDate = signer.signedAt ? new Date(signer.signedAt).toLocaleDateString() : 'Pending';
      const statusText = signer.status === 'signed' ? 'SIGNED' : 'PENDING';

      // Draw signature box border
      page.drawRectangle({
        x: currentX,
        y: 10,
        width: signatureWidth,
        height: 80,
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 1,
      });

      // Add signature text
      console.log(`🔄 Drawing bottom signature text at position:`, { x: currentX + padding, y: 70 });
      page.drawText(`Multi-Sig: ${signer.signerCustomId}`, {
        x: currentX + padding,
        y: 70,
        font: textFont,
        size: 10,
        color: rgb(0, 0, 0)
      });

      page.drawText(`Status: ${statusText}`, {
        x: currentX + padding,
        y: 55,
        font: textFont,
        size: 8,
        color: signer.status === 'signed' ? rgb(0, 0.6, 0) : rgb(0.6, 0.6, 0.6)
      });

      page.drawText(`Date: ${signDate}`, {
        x: currentX + padding,
        y: 40,
        font: textFont,
        size: 8,
        color: rgb(0, 0, 0)
      });

      page.drawText(`Order: ${signer.signingOrder + 1}`, {
        x: currentX + padding,
        y: 25,
        font: textFont,
        size: 8,
        color: rgb(0.3, 0.3, 0.3)
      });

      currentX += signatureWidth + padding;
      console.log(`✅ Bottom signer ${index + 1} drawn successfully`);
    });

    console.log('✅ All bottom signatures completed');

    // Add remaining signatures to right side (like single signature)
    const rightSignatures = signers.slice(3);
    console.log('🔄 Adding right side signatures:', rightSignatures.length);
    let currentY = 100 + padding;

    rightSignatures.forEach((signer, index) => {
      console.log(`🔄 Processing right side signer ${index + 1}:`, {
        signerCustomId: signer.signerCustomId,
        status: signer.status,
        signedAt: signer.signedAt
      });
      const signatureHeight = 80;

      // Check if signature fits in remaining vertical space
      if (currentY + signatureHeight > newHeight - padding) {
        return;
      }

      const signDate = signer.signedAt ? new Date(signer.signedAt).toLocaleDateString() : 'Pending';
      const statusText = signer.status === 'signed' ? 'SIGNED' : 'PENDING';

      // Draw signature box border
      page.drawRectangle({
        x: originalWidth + 10,
        y: currentY,
        width: 80,
        height: signatureHeight,
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 1,
      });

      // Add rotated signature text
      page.drawText(signer.signerCustomId, {
        x: originalWidth + 50,
        y: currentY + padding,
        font: textFont,
        size: 10,
        color: rgb(0, 0, 0),
        rotate: { type: 'degrees', angle: 90 }
      });

      page.drawText(`${statusText}`, {
        x: originalWidth + 35,
        y: currentY + padding,
        font: textFont,
        size: 8,
        color: signer.status === 'signed' ? rgb(0, 0.6, 0) : rgb(0.6, 0.6, 0.6),
        rotate: { type: 'degrees', angle: 90 }
      });

      page.drawText(`${signDate}`, {
        x: originalWidth + 20,
        y: currentY + padding,
        font: textFont,
        size: 8,
        color: rgb(0, 0, 0),
        rotate: { type: 'degrees', angle: 90 }
      });

      currentY += signatureHeight + padding;
      console.log(`✅ Right side signer ${index + 1} drawn successfully`);
    });

    console.log('✅ All right side signatures completed');

    // Add verification stamp with QR code in corner (on all pages like single signature)
    // Always add QR code to every page for consistency
    // Create verification stamp box
    page.drawRectangle({
      x: originalWidth,
      y: 0,
      width: 100,
      height: 100,
      color: rgb(0.9, 0.9, 1.0), // Light blue
      borderColor: rgb(0, 0, 0.8),
      borderWidth: 2,
    });

    // Add QR code
    try {
      console.log('🔄 Generating QR code for multi-signature request:', multiSigRequest.id);
      const qrCodeDataURL = await generateMultiSignatureQRCode(multiSigRequest.id);
      console.log('✅ QR code generated, data URL length:', qrCodeDataURL.length);

      // Validate data URL format
      if (!qrCodeDataURL.startsWith('data:image/png;base64,')) {
        throw new Error('Invalid QR code data URL format');
      }

      const base64Data = qrCodeDataURL.split(',')[1];
      if (!base64Data) {
        throw new Error('No base64 data found in QR code data URL');
      }

      console.log('🔄 Converting QR code to bytes, base64 length:', base64Data.length);
      const qrCodeBytes = Uint8Array.from(
        atob(base64Data),
        c => c.charCodeAt(0)
      );
      console.log('✅ QR code bytes created, length:', qrCodeBytes.length);

      console.log('🔄 Embedding QR code as PNG...');
      const qrImage = await pdfDoc.embedPng(qrCodeBytes);
      console.log('✅ QR code embedded successfully');

      // Draw QR code
      console.log('🔄 Drawing QR code at position:', { x: originalWidth + 10, y: 25 });
      page.drawImage(qrImage, {
        x: originalWidth + 10,
        y: 25,
        width: 80,
        height: 80,
      });
      console.log('✅ QR code drawn successfully');

      // Add verification text
      page.drawText('Multi-Signature', {
        x: originalWidth + 15,
        y: 15,
        font: titleFont,
        size: 8,
        color: rgb(0, 0, 0.8),
      });

      page.drawText('Scan to Verify', {
        x: originalWidth + 20,
        y: 5,
        font: smallFont,
        size: 7,
        color: rgb(0, 0, 0.8),
      });

      console.log('✅ QR code and text added successfully to page');

    } catch (qrError) {
      console.error('❌ Failed to generate QR code:', qrError);
      console.error('❌ QR Error details:', qrError instanceof Error ? qrError.message : 'Unknown error', qrError instanceof Error ? qrError.stack : undefined);

      // Always show fallback stamp even if QR fails
      console.log('🔄 Creating fallback text-only stamp...');

      page.drawText('MULTI-SIG', {
        x: originalWidth + 15,
        y: 70,
        font: titleFont,
        size: 10,
        color: rgb(0, 0, 0.8),
      });

      page.drawText('SIGNED', {
        x: originalWidth + 20,
        y: 55,
        font: titleFont,
        size: 10,
        color: rgb(0, 0, 0.8),
      });

      page.drawText(`${signers.length} Signers`, {
        x: originalWidth + 10,
        y: 35,
        font: textFont,
        size: 8,
        color: rgb(0, 0, 0.8),
      });

      const completedDate = multiSigRequest.completed_at ?
        new Date(multiSigRequest.completed_at).toLocaleDateString() :
        new Date().toLocaleDateString();
      page.drawText(completedDate, {
        x: originalWidth + 15,
        y: 20,
        font: textFont,
        size: 8,
        color: rgb(0, 0, 0.8),
      });

      console.log('✅ Fallback stamp created successfully');
    }

  } catch (error) {
    console.error('Error adding multi-signature info to page:', error);
    // Continue without signature info if there's an error
  }
}

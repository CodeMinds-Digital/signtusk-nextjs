import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import QRCode from 'qrcode';

export interface SignatureData {
  id: string;
  signerName: string;
  signerId: string;
  signature: string;
  timestamp: string;
  signatureImage?: string; // Base64 encoded signature image
}

export interface SignaturePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
}

/**
 * PDF Signature Placement Configuration
 */
export const SIGNATURE_PLACEMENTS = {
  // Bottom placements (for first 3 signatures)
  bottom: [
    { x: 20, y: 250, width: 60, height: 20 },   // Bottom left
    { x: 100, y: 250, width: 60, height: 20 },  // Bottom center
    { x: 180, y: 250, width: 60, height: 20 }   // Bottom right
  ],
  // Right margin placements (for additional signatures)
  rightMargin: [
    { x: 250, y: 50, width: 40, height: 15 },   // Top right
    { x: 250, y: 80, width: 40, height: 15 },   // Upper right
    { x: 250, y: 110, width: 40, height: 15 },  // Middle right
    { x: 250, y: 140, width: 40, height: 15 },  // Lower right
    { x: 250, y: 170, width: 40, height: 15 }   // Bottom right margin
  ]
};

/**
 * Generate a signature image from signature data
 * @param signatureData - The signature data
 * @returns Base64 encoded signature image
 */
export function generateSignatureImage(signatureData: SignatureData): string {
  // Create a canvas to generate signature image
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Clear canvas with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw signature text
  ctx.fillStyle = 'black';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';

  // Signature line
  ctx.beginPath();
  ctx.moveTo(10, 35);
  ctx.lineTo(190, 35);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Signer name
  ctx.fillText(`Signed by: ${signatureData.signerName}`, 10, 25);

  // Signer ID
  ctx.font = '10px Arial';
  ctx.fillText(`ID: ${signatureData.signerId}`, 10, 45);

  // Timestamp
  const date = new Date(signatureData.timestamp).toLocaleDateString();
  ctx.fillText(`Date: ${date}`, 10, 55);

  return canvas.toDataURL('image/png');
}

/**
 * Determine signature placements based on number of signers
 * @param signerCount - Number of signers
 * @returns Array of signature placements
 */
export function getSignaturePlacements(signerCount: number): SignaturePlacement[] {
  const placements: SignaturePlacement[] = [];

  // Place first 3 signatures at the bottom
  const bottomCount = Math.min(signerCount, 3);
  for (let i = 0; i < bottomCount; i++) {
    placements.push(SIGNATURE_PLACEMENTS.bottom[i]);
  }

  // Place remaining signatures in right margin
  const remainingCount = signerCount - 3;
  if (remainingCount > 0) {
    for (let i = 0; i < Math.min(remainingCount, SIGNATURE_PLACEMENTS.rightMargin.length); i++) {
      placements.push(SIGNATURE_PLACEMENTS.rightMargin[i]);
    }
  }

  return placements;
}

/**
 * Add signatures to a PDF document using pdf-lib
 * @param pdfBytes - Original PDF as Uint8Array
 * @param signatures - Array of signature data
 * @param originalHash - Original document hash to embed for verification
 * @returns Modified PDF with signatures as Uint8Array
 */
export async function addSignaturesToPDF(
  pdfBytes: Uint8Array,
  signatures: SignatureData[],
  originalHash?: string
): Promise<Uint8Array> {
  try {
    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Process each page to add signature areas
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      console.log(`Page ${i + 1}: Original width=${width}, Original height=${height}`);
      console.log(`Page ${i + 1}: New width=${width + 100}, New height=${height + 100}`);

      // Create a new page with expanded dimensions for signatures
      const newPage = pdfDoc.insertPage(i, [width + 100, height + 100]);

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

      // Add signatures to the bottom area
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const padding = 12;
      let currentX = padding;

      signatures.forEach((signature, index) => {
        if (index < 3) { // Bottom signatures (max 3)
          const signatureWidth = font.widthOfTextAtSize(signature.signerName, 12) + 2 * padding;

          if (currentX + signatureWidth <= width + 100 - padding) {
            // Generate unique signature code
            const signCode = Date.now().toString(36) + Math.random().toString(36).slice(2);
            const signDate = new Date(signature.timestamp).toLocaleDateString();

            // Draw signature box border
            newPage.drawRectangle({
              x: currentX,
              y: 10,
              width: signatureWidth,
              height: 80,
              borderColor: rgb(0.5, 0.5, 0.5),
              borderWidth: 1,
            });

            // Add signature text
            newPage.drawText(`Signed by: ${signature.signerName}`, {
              x: currentX + padding,
              y: 70,
              font,
              size: 10,
              color: rgb(0, 0, 0)
            });

            newPage.drawText(`ID: ${signature.signerId}`, {
              x: currentX + padding,
              y: 55,
              font,
              size: 8,
              color: rgb(0, 0, 0)
            });

            newPage.drawText(`Date: ${signDate}`, {
              x: currentX + padding,
              y: 40,
              font,
              size: 8,
              color: rgb(0, 0, 0)
            });

            newPage.drawText(`Signature: ${signature.signature.slice(0, 20)}...`, {
              x: currentX + padding,
              y: 25,
              font,
              size: 6,
              color: rgb(0.3, 0.3, 0.3)
            });

            currentX += signatureWidth + padding;
          }
        } else if (index < 8) { // Right side signatures (max 5 additional)
          const rightIndex = index - 3;
          const signatureHeight = 80;
          const startY = 100 + padding + (rightIndex * (signatureHeight + padding));

          if (startY + signatureHeight <= height + 100 - padding) {
            const signDate = new Date(signature.timestamp).toLocaleDateString();

            // Draw signature box border
            newPage.drawRectangle({
              x: width + 10,
              y: startY,
              width: 80,
              height: signatureHeight,
              borderColor: rgb(0.5, 0.5, 0.5),
              borderWidth: 1,
            });

            // Add rotated signature text
            newPage.drawText(signature.signerName, {
              x: width + 50,
              y: startY + padding,
              font,
              size: 10,
              color: rgb(0, 0, 0),
              rotate: degrees(90)
            });

            newPage.drawText(`ID: ${signature.signerId}`, {
              x: width + 35,
              y: startY + padding,
              font,
              size: 8,
              color: rgb(0, 0, 0),
              rotate: degrees(90)
            });

            newPage.drawText(`Date: ${signDate}`, {
              x: width + 20,
              y: startY + padding,
              font,
              size: 8,
              color: rgb(0, 0, 0),
              rotate: degrees(90)
            });
          }
        }
      });

      // Add verification stamp with QR code in corner if there are signatures
      if (signatures.length > 0 && originalHash) {
        // Create verification stamp box
        newPage.drawRectangle({
          x: width,
          y: 0,
          width: 100,
          height: 100,
          color: rgb(0.9, 0.9, 1.0), // Light blue
          borderColor: rgb(0, 0, 0.8),
          borderWidth: 2,
        });

        const stampFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Generate QR code for verification
        try {
          const qrData = createVerificationQRData(originalHash, signatures);
          const qrCodeDataURL = await generateQRCode(qrData);

          // Convert data URL to bytes for embedding
          const qrCodeBytes = Uint8Array.from(
            atob(qrCodeDataURL.split(',')[1]),
            c => c.charCodeAt(0)
          );

          // Embed QR code image
          const qrImage = await pdfDoc.embedPng(qrCodeBytes);

          // Draw large QR code filling most of the stamp area
          newPage.drawImage(qrImage, {
            x: width + 10,
            y: 25,
            width: 80,
            height: 80,
          });

          // Add single line text at bottom
          newPage.drawText('Scan QR to Verify', {
            x: width + 15,
            y: 10,
            font: stampFont,
            size: 8,
            color: rgb(0, 0, 0.8),
          });

        } catch (qrError) {
          console.error('Failed to generate QR code, falling back to text-only stamp:', qrError);

          // Fallback to original text-only stamp
          newPage.drawText('DIGITALLY', {
            x: width + 15,
            y: 70,
            font: stampFont,
            size: 10,
            color: rgb(0, 0, 0.8),
          });

          newPage.drawText('SIGNED', {
            x: width + 20,
            y: 55,
            font: stampFont,
            size: 10,
            color: rgb(0, 0, 0.8),
          });

          newPage.drawText(`${signatures.length} Signature${signatures.length > 1 ? 's' : ''}`, {
            x: width + 10,
            y: 35,
            font: stampFont,
            size: 8,
            color: rgb(0, 0, 0.8),
          });

          const verifyDate = new Date().toLocaleDateString();
          newPage.drawText(verifyDate, {
            x: width + 15,
            y: 20,
            font: stampFont,
            size: 8,
            color: rgb(0, 0, 0.8),
          });
        }
      }

      // Remove the original page
      pdfDoc.removePage(i + 1);
    }

    // Save and return the modified PDF
    const pdfBytesModified = await pdfDoc.save();
    return new Uint8Array(pdfBytesModified);
  } catch (error) {
    console.error('Error adding signatures to PDF:', error);
    throw new Error('Failed to add signatures to PDF');
  }
}

/**
 * Create a signature verification QR code data
 * @param documentHash - The document hash
 * @param signatures - Array of signatures (not used, kept for compatibility)
 * @param baseUrl - Base URL for the application (not used, kept for compatibility)
 * @returns QR code data string (just the document hash)
 */
export function createVerificationQRData(documentHash: string, signatures: SignatureData[], baseUrl?: string): string {
  // QR code contains only the document hash
  // When scanned, the app will construct the verification URL
  return documentHash;
}

/**
 * Generate QR code as PNG data URL
 * @param data - Data to encode in QR code
 * @returns Promise that resolves to PNG data URL
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200, // Increased size for better scanning
      margin: 2,
      color: {
        dark: '#000000', // Pure black for better contrast
        light: '#FFFFFF' // White background
      },
      errorCorrectionLevel: 'H' // High error correction for better scanning
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a signed PDF with all signatures placed according to the rules
 * @param originalFile - Original file
 * @param documentHash - Document hash
 * @param signatures - Array of signature data
 * @returns Blob containing the signed PDF
 */
export async function generateSignedPDF(
  originalFile: File,
  documentHash: string,
  signatures: SignatureData[]
): Promise<Blob> {
  try {
    // Read original file
    const originalBytes = new Uint8Array(await originalFile.arrayBuffer());

    // Add signatures to PDF with original hash for verification
    const signedPdfBytes = await addSignaturesToPDF(originalBytes, signatures, documentHash);

    return new Blob([signedPdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error generating signed PDF:', error);
    throw new Error('Failed to generate signed PDF');
  }
}

/**
 * Download a signed PDF
 * @param signedPdfBlob - The signed PDF blob
 * @param filename - Desired filename
 */
export function downloadSignedPDF(signedPdfBlob: Blob, filename: string): void {
  const url = URL.createObjectURL(signedPdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate PDF file
 * @param file - File to validate
 * @returns Validation result
 */
export function validatePDFFile(file: File): { isValid: boolean; error?: string } {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return {
      isValid: false,
      error: 'File must be a PDF document'
    };
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return {
      isValid: false,
      error: 'PDF file size must be less than 10MB'
    };
  }

  return { isValid: true };
}
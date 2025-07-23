// PDF signature insertion logic adapted from sign_insert/index.js
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';

export interface SignatureData {
  text: string;
  font: string;
  size: number;
  signerId: string;
  timestamp: string;
  signCode?: string;
}

export interface StampData {
  text: string;
  font: string;
  size: number;
}

/**
 * Insert signatures into a PDF using the sign_insert logic
 * @param pdfBytes - Original PDF as Uint8Array
 * @param signatures - Array of signature data
 * @param stamp - Optional stamp data
 * @returns Modified PDF with signatures as Uint8Array
 */
export async function insertSignaturesIntoPDF(
  pdfBytes: Uint8Array,
  signatures: SignatureData[],
  stamp?: StampData
): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Font mapping from sign_insert logic
    const fontMap: { [key: string]: any } = {
      'Helvetica-Bold': StandardFonts.HelveticaBold,
      'Times-Roman-Bold': StandardFonts.TimesRomanBold,
      'Helvetica': StandardFonts.Helvetica,
      'Times-Roman': StandardFonts.TimesRoman,
    };

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      console.log(`Page ${i + 1}: Original width=${width}, Original height=${height}`);
      console.log(`Page ${i + 1}: New width=${width}, New height=${height}`);

      // Create a new page with expanded dimensions for signature areas
      const newPage = pdfDoc.insertPage(i, [width, height]);

      // Draw signature areas
      // Bottom rectangle for signatures (light gray background)
      newPage.drawRectangle({
        x: 0,
        y: 0,
        width: width - 100,
        height: 100,
        color: rgb(0.95, 0.95, 0.95), // Light gray
      });

      // Right rectangle for additional signatures (light gray background)
      newPage.drawRectangle({
        x: width - 100,
        y: 100,
        width: 100,
        height: height - 100,
        color: rgb(0.95, 0.95, 0.95), // Light gray
      });

      // Corner rectangle for stamp (light gray background)
      newPage.drawRectangle({
        x: width - 100,
        y: 0,
        width: 100,
        height: 100,
        color: rgb(0.9, 0.9, 0.9), // Slightly darker gray
      });

      // Embed the original page content
      const embeddedPage = await pdfDoc.embedPage(page);

      // Draw the original page content on the new page, positioned to leave space for signatures
      newPage.drawPage(embeddedPage, {
        x: 0,
        y: 100,
        width: width - 100,
        height: height - 100,
      });

      // Add signatures
      await addSignaturesToPage(pdfDoc, newPage, signatures, width, height, fontMap);

      // Add stamp if provided
      if (stamp) {
        await addStampToPage(pdfDoc, newPage, stamp, width, fontMap);
      }

      // Remove the original page
      pdfDoc.removePage(i + 1);
    }

    const modifiedPdfBytes = await pdfDoc.save();
    return modifiedPdfBytes;
  } catch (error) {
    console.error('Error inserting signatures into PDF:', error);
    throw new Error('Failed to insert signatures into PDF');
  }
}

/**
 * Add signatures to a PDF page following the sign_insert placement logic
 */
async function addSignaturesToPage(
  pdfDoc: PDFDocument,
  page: any,
  signatures: SignatureData[],
  width: number,
  height: number,
  fontMap: { [key: string]: any }
): Promise<void> {
  const padding = 12;

  // Bottom signatures (horizontal placement)
  let currentX = padding;
  let signatureIndex = 0;
  
  // Calculate how many signatures fit in the bottom area
  const bottomSignatures = signatures.slice(0, Math.min(signatures.length, 3));
  
  for (const signature of bottomSignatures) {
    const font = await pdfDoc.embedFont(fontMap[signature.font] || StandardFonts.Helvetica);
    const signatureWidth = font.widthOfTextAtSize(signature.text, 14) + 2 * padding;

    // Check if signature fits in remaining space
    if (currentX + signatureWidth > width - 100) {
      break;
    }

    const signCode = signature.signCode || generateSignCode();
    const signDate = new Date(signature.timestamp).toLocaleDateString();

    // Draw signature text
    page.drawText(signature.text, {
      x: currentX + padding,
      y: 60,
      font,
      size: 14,
      color: rgb(0, 0, 0)
    });

    // Draw date
    page.drawText(`Date: ${signDate}`, {
      x: currentX + padding,
      y: 45,
      font,
      size: 8,
      color: rgb(0, 0, 0)
    });

    // Draw signer ID
    page.drawText(`ID: ${signature.signerId}`, {
      x: currentX + padding,
      y: 30,
      font,
      size: 8,
      color: rgb(0, 0, 0)
    });

    // Draw signature code
    page.drawText(`Code: ${signCode.slice(0, 10)}`, {
      x: currentX + padding,
      y: 15,
      font,
      size: 8,
      color: rgb(0, 0, 0)
    });

    currentX += signatureWidth;
    signatureIndex++;
  }

  // Right signatures (vertical placement) for additional signatures
  const rightSignatures = signatures.slice(3); // Signatures beyond the first 3
  let currentY = 100 + padding;
  
  for (const signature of rightSignatures) {
    const font = await pdfDoc.embedFont(fontMap[signature.font] || StandardFonts.Helvetica);
    const signatureHeight = 80; // Fixed height for each signature block

    // Check if signature fits in remaining vertical space
    if (currentY + signatureHeight > height) {
      break;
    }

    const signCode = signature.signCode || generateSignCode();
    const signDate = new Date(signature.timestamp).toLocaleDateString();

    // Draw signature text (rotated 90 degrees)
    page.drawText(signature.text, {
      x: width - 40,
      y: currentY + padding,
      font,
      size: 12,
      color: rgb(0, 0, 0),
      rotate: { type: 'degrees', angle: 90 }
    });

    // Draw date (rotated 90 degrees)
    page.drawText(`Date: ${signDate}`, {
      x: width - 55,
      y: currentY + padding,
      font,
      size: 7,
      color: rgb(0, 0, 0),
      rotate: { type: 'degrees', angle: 90 }
    });

    // Draw signer ID (rotated 90 degrees)
    page.drawText(`ID: ${signature.signerId}`, {
      x: width - 70,
      y: currentY + padding,
      font,
      size: 7,
      color: rgb(0, 0, 0),
      rotate: { type: 'degrees', angle: 90 }
    });

    // Draw signature code (rotated 90 degrees)
    page.drawText(`Code: ${signCode.slice(0, 8)}`, {
      x: width - 85,
      y: currentY + padding,
      font,
      size: 7,
      color: rgb(0, 0, 0),
      rotate: { type: 'degrees', angle: 90 }
    });

    currentY += signatureHeight;
  }
}

/**
 * Add stamp to the corner of the PDF page
 */
async function addStampToPage(
  pdfDoc: PDFDocument,
  page: any,
  stamp: StampData,
  width: number,
  fontMap: { [key: string]: any }
): Promise<void> {
  const stampFont = await pdfDoc.embedFont(fontMap[stamp.font] || StandardFonts.Helvetica);
  const stampTextWidth = stampFont.widthOfTextAtSize(stamp.text, stamp.size);
  
  // Center the stamp text in the corner rectangle
  page.drawText(stamp.text, {
    x: width - 100 + (100 - stampTextWidth) / 2,
    y: 50,
    font: stampFont,
    size: stamp.size,
    color: rgb(0.2, 0.2, 0.8), // Dark blue color for stamp
  });
}

/**
 * Generate a unique signature code
 */
function generateSignCode(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Create signature data from user information
 */
export function createSignatureData(
  signerName: string,
  signerId: string,
  timestamp: string = new Date().toISOString(),
  font: string = 'Helvetica-Bold',
  size: number = 12
): SignatureData {
  return {
    text: signerName,
    font,
    size,
    signerId,
    timestamp,
    signCode: generateSignCode()
  };
}

/**
 * Create stamp data
 */
export function createStampData(
  text: string = 'SIGNED',
  font: string = 'Helvetica-Bold',
  size: number = 15
): StampData {
  return {
    text,
    font,
    size
  };
}

/**
 * Validate PDF for signature insertion
 */
export function validatePDFForSigning(file: File): { isValid: boolean; error?: string } {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return {
      isValid: false,
      error: 'File must be a PDF document'
    };
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    return {
      isValid: false,
      error: 'PDF file size must be less than 50MB'
    };
  }
  
  return { isValid: true };
}
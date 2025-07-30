/**
 * API route for extracting data from steganographic images
 * POST /api/steganography/extract
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractDataFromImage } from '@/lib/steganography';
import { decryptWallet } from '@/lib/wallet';

interface ExtractSteganographyRequest {
  stegoImage: string; // Base64 encoded image data
  stegoKey: string;
  password: string;
  dataType: 'wallet_backup' | 'private_key' | 'mnemonic';
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ExtractSteganographyRequest = await request.json();
    const { stegoImage, stegoKey, password, dataType } = body;

    // Validate required fields
    if (!stegoImage || !stegoKey || !password || !dataType) {
      return NextResponse.json(
        { error: 'Missing required fields: stegoImage, stegoKey, password, dataType' },
        { status: 400 }
      );
    }

    // Validate stegoKey format (should be 32 characters)
    if (stegoKey.length < 16) {
      return NextResponse.json(
        { error: 'Invalid steganographic key format' },
        { status: 400 }
      );
    }

    try {
      // Convert base64 image to blob
      const base64Data = stegoImage.split(',')[1];
      if (!base64Data) {
        return NextResponse.json(
          { error: 'Invalid image format' },
          { status: 400 }
        );
      }

      const mimeType = stegoImage.split(',')[0].split(':')[1].split(';')[0];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const imageBlob = new Blob([byteArray], { type: mimeType });

      // Extract hidden data from image
      const extractedData = await extractDataFromImage(imageBlob, stegoKey);
      
      // Parse the extracted JSON data
      let parsedData;
      try {
        parsedData = JSON.parse(extractedData);
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Invalid steganographic data format' },
          { status: 400 }
        );
      }

      // Validate data structure based on type
      if (dataType === 'wallet_backup') {
        if (!parsedData.encryptedMnemonic || !parsedData.encryptedPrivateKey || !parsedData.address || !parsedData.salt) {
          return NextResponse.json(
            { error: 'Invalid wallet backup data structure' },
            { status: 400 }
          );
        }
      } else if (dataType === 'private_key') {
        if (!parsedData.encryptedPrivateKey || !parsedData.address || !parsedData.salt) {
          return NextResponse.json(
            { error: 'Invalid private key data structure' },
            { status: 400 }
          );
        }
      } else if (dataType === 'mnemonic') {
        if (!parsedData.encryptedMnemonic || !parsedData.address || !parsedData.salt) {
          return NextResponse.json(
            { error: 'Invalid mnemonic data structure' },
            { status: 400 }
          );
        }
      }

      // Attempt to decrypt the wallet data with provided password
      try {
        let decryptedWallet;
        
        if (dataType === 'wallet_backup') {
          decryptedWallet = decryptWallet({
            encryptedPrivateKey: parsedData.encryptedPrivateKey,
            encryptedMnemonic: parsedData.encryptedMnemonic,
            salt: parsedData.salt,
            customId: parsedData.customId
          }, password);
        } else if (dataType === 'private_key') {
          decryptedWallet = decryptWallet({
            encryptedPrivateKey: parsedData.encryptedPrivateKey,
            encryptedMnemonic: '', // Not available for private key only
            salt: parsedData.salt,
            customId: parsedData.customId || ''
          }, password);
        } else if (dataType === 'mnemonic') {
          decryptedWallet = decryptWallet({
            encryptedPrivateKey: '', // Not available for mnemonic only
            encryptedMnemonic: parsedData.encryptedMnemonic,
            salt: parsedData.salt,
            customId: parsedData.customId || ''
          }, password);
        }

        // Return successful extraction with decrypted wallet data
        return NextResponse.json({
          success: true,
          dataType,
          walletData: {
            address: parsedData.address,
            customId: parsedData.customId,
            mnemonic: decryptedWallet?.mnemonic || undefined,
            privateKey: decryptedWallet?.privateKey || undefined,
            timestamp: parsedData.timestamp,
            version: parsedData.version
          },
          metadata: {
            extractedAt: new Date().toISOString(),
            originalTimestamp: parsedData.timestamp,
            version: parsedData.version
          },
          message: 'Wallet data extracted and decrypted successfully'
        });

      } catch (decryptError) {
        console.error('Decryption error:', decryptError);
        return NextResponse.json(
          { error: 'Invalid password or corrupted data' },
          { status: 400 }
        );
      }

    } catch (extractError) {
      console.error('Extraction error:', extractError);
      return NextResponse.json(
        { error: 'Failed to extract data from image. Invalid steganographic key or corrupted image.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error extracting steganographic data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

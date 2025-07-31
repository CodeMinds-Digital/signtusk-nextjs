/**
 * API route for creating steganographic backups
 * POST /api/steganography/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { hideDataInImage, hashStegoKey, WalletStegoData } from '@/lib/steganography';
import { createSteganographicImage, logSteganographicAccess } from '@/lib/steganography-storage-test';
import { encryptWallet } from '@/lib/wallet';

interface CreateSteganographyRequest {
  walletData: {
    mnemonic: string;
    privateKey: string;
    address: string;
    customId: string;
  };
  password: string;
  imageName: string;
  dataType: 'wallet_backup' | 'private_key' | 'mnemonic';
  expiresInDays?: number;
  carrierImage?: string; // Base64 encoded image data
}

export async function POST(request: NextRequest) {
  try {
    // Simplified authentication - check for wallet address in request
    // TODO: Implement proper JWT verification once auth system is fully set up

    // Parse request body
    const body: CreateSteganographyRequest = await request.json();
    const { walletData, password, imageName, dataType, expiresInDays, carrierImage } = body;

    // Validate required fields
    if (!walletData || !password || !imageName || !dataType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Basic validation - ensure wallet address is provided
    if (!walletData.address || !walletData.customId) {
      return NextResponse.json(
        { error: 'Wallet address and custom ID are required' },
        { status: 400 }
      );
    }

    // Encrypt wallet data
    const encryptedWallet = encryptWallet(walletData, password);

    // Prepare data to hide based on type
    let dataToHide: string;
    switch (dataType) {
      case 'wallet_backup':
        const walletStegoData: WalletStegoData = {
          encryptedMnemonic: encryptedWallet.encryptedMnemonic,
          encryptedPrivateKey: encryptedWallet.encryptedPrivateKey,
          address: walletData.address,
          customId: walletData.customId,
          salt: encryptedWallet.salt,
          version: 'v2',
          timestamp: Date.now()
        };
        dataToHide = JSON.stringify(walletStegoData);
        break;
      case 'private_key':
        dataToHide = JSON.stringify({
          encryptedPrivateKey: encryptedWallet.encryptedPrivateKey,
          address: walletData.address,
          salt: encryptedWallet.salt,
          version: 'v2',
          timestamp: Date.now()
        });
        break;
      case 'mnemonic':
        dataToHide = JSON.stringify({
          encryptedMnemonic: encryptedWallet.encryptedMnemonic,
          address: walletData.address,
          salt: encryptedWallet.salt,
          version: 'v2',
          timestamp: Date.now()
        });
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        );
    }

    // Process carrier image if provided
    let carrierImageFile: File | undefined;
    if (carrierImage) {
      try {
        // Convert base64 to blob
        const base64Data = carrierImage.split(',')[1];
        const mimeType = carrierImage.split(',')[0].split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        carrierImageFile = new File([blob], 'carrier.png', { type: mimeType });
      } catch (error) {
        console.error('Error processing carrier image:', error);
        return NextResponse.json(
          { error: 'Invalid carrier image format' },
          { status: 400 }
        );
      }
    }

    // Hide data in image
    const stegoResult = await hideDataInImage(dataToHide, carrierImageFile);

    // Calculate expiration date
    let expiresAt: Date | undefined;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Determine image format
    const imageFormat = carrierImageFile?.type.includes('jpeg') ? 'JPEG' : 'PNG';

    // Store steganographic image
    const storeResult = await createSteganographicImage(
      stegoResult.stegoImage,
      {
        customId: walletData.customId,
        walletAddress: walletData.address,
        imageName,
        originalCarrierName: carrierImageFile?.name,
        stegoKeyHash: hashStegoKey(stegoResult.stegoKey),
        dataType,
        encryptionVersion: 'v2',
        imageFormat,
        expiresAt,
        additionalMetadata: {
          originalSize: stegoResult.originalSize,
          stegoSize: stegoResult.stegoSize,
          compressionRatio: stegoResult.originalSize > 0 ? stegoResult.stegoSize / stegoResult.originalSize : 1
        }
      }
    );

    if (!storeResult.success) {
      // Log failed attempt
      await logSteganographicAccess(
        'unknown',
        walletData.customId,
        'create',
        false,
        storeResult.error,
        { image_name: imageName, data_type: dataType },
        request.ip,
        request.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        { error: storeResult.error },
        { status: 500 }
      );
    }

    // Return success with stego key (only time it's provided)
    return NextResponse.json({
      success: true,
      imageId: storeResult.imageId,
      stegoKey: stegoResult.stegoKey,
      imageName,
      dataType,
      fileSize: stegoResult.stegoSize,
      expiresAt: expiresAt?.toISOString(),
      message: 'Steganographic backup created successfully. Save the stego key securely - it cannot be recovered!'
    });

  } catch (error) {
    console.error('Error creating steganographic backup:', error);
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

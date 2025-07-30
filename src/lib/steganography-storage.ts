/**
 * Database operations for steganography functionality
 * Handles storage and retrieval of steganographic image metadata
 */

import { supabase, supabaseAdmin } from './supabase';
import { uploadBlobAsAdmin } from './supabase-admin';

/**
 * Interface for steganographic image record
 */
export interface SteganographicImage {
  id: string;
  user_profile_id: string;
  custom_id: string;
  wallet_address: string;
  image_name: string;
  original_carrier_name?: string;
  supabase_path: string;
  public_url?: string;
  stego_key_hash: string;
  data_type: 'wallet_backup' | 'private_key' | 'mnemonic' | 'custom_data';
  encryption_version: string;
  file_size: number;
  image_format: 'PNG' | 'JPEG' | 'JPG';
  metadata?: any;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  expires_at?: string;
  download_count: number;
  last_downloaded_at?: string;
}

/**
 * Interface for steganographic access log
 */
export interface SteganographicAccessLog {
  id: string;
  steganographic_image_id: string;
  user_custom_id: string;
  user_wallet_address: string;
  access_type: 'create' | 'download' | 'view' | 'delete' | 'verify';
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  additional_data?: any;
  timestamp: string;
}

/**
 * Create a new steganographic image record
 */
export async function createSteganographicImage(
  imageBlob: Blob,
  metadata: {
    customId: string;
    walletAddress: string;
    imageName: string;
    originalCarrierName?: string;
    stegoKeyHash: string;
    dataType: 'wallet_backup' | 'private_key' | 'mnemonic' | 'custom_data';
    encryptionVersion: string;
    imageFormat: 'PNG' | 'JPEG' | 'JPG';
    expiresAt?: Date;
    additionalMetadata?: any;
  }
): Promise<{ success: boolean; imageId?: string; error?: string }> {
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const fileName = `stego_${metadata.customId}_${timestamp}.${metadata.imageFormat.toLowerCase()}`;
    const filePath = `steganographic/${metadata.customId}/${fileName}`;

    // Upload image to Supabase storage
    const uploadResult = await uploadBlobAsAdmin(
      imageBlob,
      'documents',
      filePath,
      `image/${metadata.imageFormat.toLowerCase()}`
    );

    if (uploadResult.error) {
      console.error('Failed to upload steganographic image:', uploadResult.error);
      return { success: false, error: 'Failed to upload image' };
    }

    // Get user profile ID
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('custom_id', metadata.customId)
      .single();

    if (userError || !userProfile) {
      console.error('Failed to get user profile:', userError);
      return { success: false, error: 'User not found' };
    }

    // Insert steganographic image record
    const { data: imageRecord, error: insertError } = await supabaseAdmin
      .from('steganographic_images')
      .insert({
        user_profile_id: userProfile.id,
        custom_id: metadata.customId,
        wallet_address: metadata.walletAddress,
        image_name: metadata.imageName,
        original_carrier_name: metadata.originalCarrierName,
        supabase_path: filePath,
        public_url: uploadResult.publicUrl,
        stego_key_hash: metadata.stegoKeyHash,
        data_type: metadata.dataType,
        encryption_version: metadata.encryptionVersion,
        file_size: imageBlob.size,
        image_format: metadata.imageFormat,
        metadata: metadata.additionalMetadata,
        expires_at: metadata.expiresAt?.toISOString(),
        is_active: true,
        download_count: 0
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert steganographic image record:', insertError);
      return { success: false, error: 'Failed to save image metadata' };
    }

    // Log the creation
    await logSteganographicAccess(
      imageRecord.id,
      metadata.customId,
      'create',
      true,
      undefined,
      { image_name: metadata.imageName, data_type: metadata.dataType }
    );

    return { success: true, imageId: imageRecord.id };
  } catch (error) {
    console.error('Error creating steganographic image:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get user's steganographic images
 */
export async function getUserSteganographicImages(
  customId: string
): Promise<{ success: boolean; images?: SteganographicImage[]; error?: string }> {
  try {
    const { data: images, error } = await supabaseAdmin
      .from('steganographic_images')
      .select('*')
      .eq('custom_id', customId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get steganographic images:', error);
      return { success: false, error: 'Failed to retrieve images' };
    }

    return { success: true, images: images || [] };
  } catch (error) {
    console.error('Error getting steganographic images:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get a specific steganographic image by ID
 */
export async function getSteganographicImageById(
  imageId: string,
  customId: string
): Promise<{ success: boolean; image?: SteganographicImage; error?: string }> {
  try {
    const { data: image, error } = await supabaseAdmin
      .from('steganographic_images')
      .select('*')
      .eq('id', imageId)
      .eq('custom_id', customId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Failed to get steganographic image:', error);
      return { success: false, error: 'Image not found' };
    }

    return { success: true, image };
  } catch (error) {
    console.error('Error getting steganographic image:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Update download statistics for a steganographic image
 */
export async function updateDownloadStats(
  imageId: string,
  customId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('steganographic_images')
      .update({
        download_count: supabaseAdmin.raw('download_count + 1'),
        last_downloaded_at: new Date().toISOString()
      })
      .eq('id', imageId)
      .eq('custom_id', customId);

    if (error) {
      console.error('Failed to update download stats:', error);
      return { success: false, error: 'Failed to update statistics' };
    }

    // Log the download
    await logSteganographicAccess(imageId, customId, 'download', true);

    return { success: true };
  } catch (error) {
    console.error('Error updating download stats:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Delete a steganographic image (mark as inactive)
 */
export async function deleteSteganographicImage(
  imageId: string,
  customId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('steganographic_images')
      .update({ is_active: false })
      .eq('id', imageId)
      .eq('custom_id', customId);

    if (error) {
      console.error('Failed to delete steganographic image:', error);
      return { success: false, error: 'Failed to delete image' };
    }

    // Log the deletion
    await logSteganographicAccess(imageId, customId, 'delete', true);

    return { success: true };
  } catch (error) {
    console.error('Error deleting steganographic image:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Log steganographic access attempt
 */
export async function logSteganographicAccess(
  imageId: string,
  customId: string,
  accessType: 'create' | 'download' | 'view' | 'delete' | 'verify',
  success: boolean = true,
  errorMessage?: string,
  additionalData?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Get wallet address for the user
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('wallet_address')
      .eq('custom_id', customId)
      .single();

    if (walletError) {
      console.error('Failed to get wallet for logging:', walletError);
      return;
    }

    await supabaseAdmin
      .from('steganographic_access_logs')
      .insert({
        steganographic_image_id: imageId,
        user_custom_id: customId,
        user_wallet_address: wallet.wallet_address,
        access_type: accessType,
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        error_message: errorMessage,
        additional_data: additionalData
      });
  } catch (error) {
    console.error('Error logging steganographic access:', error);
    // Don't throw error for logging failures
  }
}

/**
 * Get steganographic access logs for a user
 */
export async function getSteganographicAccessLogs(
  customId: string,
  limit: number = 50
): Promise<{ success: boolean; logs?: SteganographicAccessLog[]; error?: string }> {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('steganographic_access_logs')
      .select('*')
      .eq('user_custom_id', customId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get access logs:', error);
      return { success: false, error: 'Failed to retrieve logs' };
    }

    return { success: true, logs: logs || [] };
  } catch (error) {
    console.error('Error getting access logs:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Clean up expired steganographic images
 */
export async function cleanupExpiredImages(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const { data: expiredImages, error: selectError } = await supabaseAdmin
      .from('steganographic_images')
      .select('id, custom_id')
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (selectError) {
      console.error('Failed to get expired images:', selectError);
      return { success: false, error: 'Failed to get expired images' };
    }

    if (!expiredImages || expiredImages.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Mark expired images as inactive
    const { error: updateError } = await supabaseAdmin
      .from('steganographic_images')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true);

    if (updateError) {
      console.error('Failed to mark expired images as inactive:', updateError);
      return { success: false, error: 'Failed to cleanup expired images' };
    }

    // Log cleanup for each image
    for (const image of expiredImages) {
      await logSteganographicAccess(
        image.id,
        image.custom_id,
        'delete',
        true,
        undefined,
        { reason: 'expired' }
      );
    }

    return { success: true, deletedCount: expiredImages.length };
  } catch (error) {
    console.error('Error cleaning up expired images:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get steganographic statistics
 */
export async function getSteganographicStats(): Promise<{
  success: boolean;
  stats?: {
    totalImages: number;
    activeImages: number;
    totalDownloads: number;
    uniqueUsers: number;
  };
  error?: string;
}> {
  try {
    const { data: stats, error } = await supabaseAdmin
      .rpc('get_steganographic_stats');

    if (error) {
      console.error('Failed to get steganographic stats:', error);
      return { success: false, error: 'Failed to get statistics' };
    }

    return { success: true, stats: stats[0] };
  } catch (error) {
    console.error('Error getting steganographic stats:', error);
    return { success: false, error: 'Internal server error' };
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @returns Upload result with public URL
 */
export async function uploadFileToSupabase(
  file: File, 
  bucket: string = 'documents', 
  path?: string
): Promise<{ data: any; error: any; publicUrl?: string }> {
  try {
    const fileName = path || `${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { data: null, error };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return { 
      data, 
      error: null, 
      publicUrl: urlData.publicUrl 
    };
  } catch (error) {
    console.error('Upload exception:', error);
    return { data: null, error };
  }
}

/**
 * Download a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @returns File blob
 */
export async function downloadFileFromSupabase(
  bucket: string = 'documents', 
  path: string
): Promise<{ data: Blob | null; error: any }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      console.error('Download error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Download exception:', error);
    return { data: null, error };
  }
}

/**
 * Upload a blob to Supabase Storage
 * @param blob - The blob to upload
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @param contentType - The content type of the blob
 * @returns Upload result with public URL
 */
export async function uploadBlobToSupabase(
  blob: Blob,
  bucket: string = 'documents',
  path: string,
  contentType: string = 'application/pdf'
): Promise<{ data: any; error: any; publicUrl?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType
      });

    if (error) {
      console.error('Blob upload error:', error);
      return { data: null, error };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { 
      data, 
      error: null, 
      publicUrl: urlData.publicUrl 
    };
  } catch (error) {
    console.error('Blob upload exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @returns Delete result
 */
export async function deleteFileFromSupabase(
  bucket: string = 'documents',
  path: string
): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Delete exception:', error);
    return { data: null, error };
  }
}

/**
 * Get public URL for a file in Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @returns Public URL
 */
export function getPublicUrl(bucket: string = 'documents', path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * List files in a Supabase Storage bucket
 * @param bucket - The storage bucket name
 * @param path - The folder path (optional)
 * @returns List of files
 */
export async function listFilesInSupabase(
  bucket: string = 'documents',
  path: string = ''
): Promise<{ data: any[] | null; error: any }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);

    if (error) {
      console.error('List files error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('List files exception:', error);
    return { data: null, error };
  }
}
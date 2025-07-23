import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client with service role key - bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Upload a file using admin privileges (bypasses RLS)
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @returns Upload result with public URL
 */
export async function uploadFileAsAdmin(
  file: File, 
  bucket: string = 'documents', 
  path?: string
): Promise<{ data: any; error: any; publicUrl?: string }> {
  try {
    const fileName = path || `${Date.now()}_${file.name}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Admin upload error:', error);
      return { data: null, error };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return { 
      data, 
      error: null, 
      publicUrl: urlData.publicUrl 
    };
  } catch (error) {
    console.error('Admin upload exception:', error);
    return { data: null, error };
  }
}

/**
 * Upload a blob using admin privileges (bypasses RLS)
 * @param blob - The blob to upload
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @param contentType - The content type of the blob
 * @returns Upload result with public URL
 */
export async function uploadBlobAsAdmin(
  blob: Blob,
  bucket: string = 'documents',
  path: string,
  contentType: string = 'application/pdf'
): Promise<{ data: any; error: any; publicUrl?: string }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType
      });

    if (error) {
      console.error('Admin blob upload error:', error);
      return { data: null, error };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    return { 
      data, 
      error: null, 
      publicUrl: urlData.publicUrl 
    };
  } catch (error) {
    console.error('Admin blob upload exception:', error);
    return { data: null, error };
  }
}

/**
 * Download a file using admin privileges (bypasses RLS)
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @returns File blob
 */
export async function downloadFileAsAdmin(
  bucket: string = 'documents', 
  path: string
): Promise<{ data: Blob | null; error: any }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (error) {
      console.error('Admin download error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Admin download exception:', error);
    return { data: null, error };
  }
}

/**
 * Delete a file using admin privileges (bypasses RLS)
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @returns Delete result
 */
export async function deleteFileAsAdmin(
  bucket: string = 'documents',
  path: string
): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Admin delete error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Admin delete exception:', error);
    return { data: null, error };
  }
}

/**
 * List files using admin privileges (bypasses RLS)
 * @param bucket - The storage bucket name
 * @param path - The folder path (optional)
 * @returns List of files
 */
export async function listFilesAsAdmin(
  bucket: string = 'documents',
  path: string = ''
): Promise<{ data: any[] | null; error: any }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(path);

    if (error) {
      console.error('Admin list files error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Admin list files exception:', error);
    return { data: null, error };
  }
}
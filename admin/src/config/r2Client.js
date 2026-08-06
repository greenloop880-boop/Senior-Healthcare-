import { supabase } from './supabaseClient';

export const uploadToR2 = async (file, folder) => {
  try {
    const fileExt = file.name.split('.').pop();
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // 1. Get the pre-signed URL from our secure Edge Function
    const { data, error } = await supabase.functions.invoke('r2-upload', {
      body: { filename, contentType: file.type }
    });

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Failed to get upload URL');
    }

    // 2. Upload the file directly to Cloudflare R2 using the pre-signed URL
    const uploadRes = await fetch(data.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed with status: ${uploadRes.status}`);
    }

    // 3. Return the public URL for the database
    return data.publicUrl;
  } catch (err) {
    console.error(`Failed to upload to R2 via Edge Function:`, err);
    throw err;
  }
};

export const deleteFromR2 = async (imageUrl) => {
  console.warn('Delete operation should also be moved to an Edge Function if needed. For now, deletions are disabled for security.');
};

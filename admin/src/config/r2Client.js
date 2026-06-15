import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: import.meta.env.VITE_CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const R2_PUBLIC_URL = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL;
const BUCKET = import.meta.env.VITE_CLOUDFLARE_R2_BUCKET || 'storage';

export const uploadToR2 = async (file, folder) => {
  try {
    const fileExt = file.name.split('.').pop();
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: filename,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type
    }));

    return `${R2_PUBLIC_URL}/${filename}`;
  } catch (err) {
    console.error(`Failed to upload to R2:`, err);
    throw err;
  }
};

export const deleteFromR2 = async (imageUrl) => {
  try {
    // Extract key from URL
    const key = imageUrl.replace(`${R2_PUBLIC_URL}/`, '');
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    }));
  } catch (err) {
    console.error('Failed to delete from R2:', err);
  }
};

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../admin/.env') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.VITE_CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.VITE_CLOUDFLARE_R2_BUCKET || 'storage';

async function listR2Files() {
  try {
    const command = new ListObjectsV2Command({ Bucket: BUCKET });
    const response = await s3Client.send(command);
    
    if (response.Contents) {
      console.log(`Found ${response.Contents.length} files in R2 bucket.`);
      for (const item of response.Contents) {
        console.log(`- ${item.Key} (${item.Size} bytes)`);
      }
    } else {
      console.log("Bucket is empty.");
    }
  } catch (err) {
    console.error("Error listing R2 files:", err);
  }
}

listR2Files();

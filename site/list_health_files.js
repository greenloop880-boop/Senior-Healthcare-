import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', 'admin', '.env') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.VITE_CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.VITE_CLOUDFLARE_R2_BUCKET || 'storage';
const PUBLIC_URL = process.env.VITE_CLOUDFLARE_R2_PUBLIC_URL;

async function run() {
  try {
    const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'health/' });
    const response = await s3Client.send(command);
    if (!response.Contents) {
      console.log("No files found in 'health/'");
      return;
    }
    const files = response.Contents.sort((a, b) => a.LastModified - b.LastModified).map(item => `${PUBLIC_URL}/${item.Key}`);
    console.log("Files in 'health/':");
    console.log(JSON.stringify(files, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}

run();

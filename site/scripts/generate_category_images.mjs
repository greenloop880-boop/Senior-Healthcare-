import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', 'admin', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.VITE_CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.VITE_CLOUDFLARE_R2_BUCKET;
const PUBLIC_URL = 'https://pub-491acc29113c488184f9213225b80bba.r2.dev';

async function downloadAndUploadImage(prompt, width, height, fileNamePrefix) {
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&private=true&seed=${seed}`;

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const s3Key = `categories/category-${fileNamePrefix}-${Date.now()}-${seed}.png`;
      
      await S3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/png'
      }));

      return `${PUBLIC_URL}/${s3Key}`;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function run() {
  const { data: categories, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
  if (error) {
    console.error("Failed to fetch categories:", error);
    process.exit(1);
  }

  for (const cat of categories) {
    console.log(`Processing Category: ${cat.title}...`);

    try {
      const prompt = `A professional high quality clean image representing the health product category '${cat.title}', modern minimal studio style, vibrant engaging look, pure white background.`;
      
      const imageUrl = await downloadAndUploadImage(prompt, 800, 800, cat.title.replace(/[^a-zA-Z0-9]/g, ''));
      
      const { error: updateError } = await supabase.from('categories').update({
        image_url: imageUrl
      }).eq('id', cat.id);

      if (updateError) throw updateError;

      console.log(`Successfully updated ${cat.title} with ${imageUrl}`);
    } catch (e) {
      console.error(`Error processing ${cat.title}:`, e);
    }
  }

  console.log("All categories processed successfully!");
}

run();

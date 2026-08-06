import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use site's .env to fetch supabase details, admin's for S3
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '..', 'admin', '.env'), override: false });

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
      const s3Key = `health/health-${fileNamePrefix}-${Date.now()}-${seed}.png`;
      
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
  console.log("Generating image for Joint Health Assessment...");
  const prompt = `A professional health review assessment image for Joint Health and Mobility Care, showing an elderly person doing light joint exercises or a doctor examining a knee, soft warm inviting lighting, clean minimal background.`;
  
  const imageUrl = await downloadAndUploadImage(prompt, 1000, 1400, "JointHealth");
  
  console.log(`Generated and uploaded image: ${imageUrl}`);

  const newReview = {
    title: "Joint Health Assessment",
    image_url: imageUrl,
    description: "Analyze your flexibility, balance, and joint strain markers to receive custom mobility care recommendations.",
    tag: "Mobility Care",
    link: "/self-assessment-page/knee-pain",
    quiz_id: "joint"
  };

  const { error } = await supabase.from('health_reviews').insert([newReview]);
  if (error) {
    console.error("Error inserting health review:", error);
  } else {
    console.log("Successfully inserted Joint Health Assessment.");
  }
}

run();

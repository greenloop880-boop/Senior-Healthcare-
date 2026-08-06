import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
const STATE_FILE = join(__dirname, 'generation_state.json');

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
      const s3Key = `products/generated-${fileNamePrefix}-${Date.now()}-${seed}.png`;
      
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
  const { data: products, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if (error) {
    console.error("Failed to fetch products:", error);
    process.exit(1);
  }

  let state = {};
  if (fs.existsSync(STATE_FILE)) {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }

  for (const prod of products) {
    if (state[prod.id]) {
      console.log(`Skipping ${prod.id}, already processed.`);
      continue;
    }

    console.log(`Processing ${prod.id}...`);

    try {
      // Prompts for Gallery Images (800x800)
      const galleryPrompts = [
        `A professional e-commerce product photograph of ${prod.title}, clean white studio background, front view, highly detailed.`,
        `A professional e-commerce product photograph of ${prod.title}, clean white studio background, side angle view, highly detailed.`,
        `A professional e-commerce product photograph of ${prod.title}, in a clean modern home setting, lifestyle shot.`,
        `A professional e-commerce product close-up photograph of ${prod.title} showing material texture, white background.`
      ];

      // Prompts for Feature Banners (1000x1000)
      const bannerPrompts = [
        `A promotional feature banner for ${prod.title}, modern design, showing the product in action with space for text, high quality.`,
        `A premium feature banner for ${prod.title}, highlighting the key benefits, clean clinical background, high quality.`,
        `A lifestyle feature banner for ${prod.title}, a senior citizen happily using the product in a bright sunny room.`,
        `An infographic style background banner for ${prod.title}, clean studio lighting, high resolution.`
      ];

      const galleryUrls = [];
      const bannerUrls = [];

      for (let i = 0; i < 4; i++) {
        console.log(`  Generating Gallery ${i+1}/4...`);
        const url = await downloadAndUploadImage(galleryPrompts[i], 800, 800, `gallery-${prod.id}-${i}`);
        galleryUrls.push(url);
      }

      for (let i = 0; i < 4; i++) {
        console.log(`  Generating Banner ${i+1}/4...`);
        const url = await downloadAndUploadImage(bannerPrompts[i], 1000, 1000, `banner-${prod.id}-${i}`);
        bannerUrls.push(url);
      }

      // Update Supabase
      let newSpecs = prod.specs || [];
      newSpecs = newSpecs.filter(s => !s.startsWith('__GALLERY__:'));
      newSpecs.push(`__GALLERY__:${JSON.stringify(galleryUrls)}`);

      const { error: updateError } = await supabase.from('products').update({
        specs: newSpecs,
        detail_banners: bannerUrls
      }).eq('id', prod.id);

      if (updateError) throw updateError;

      // Update State
      state[prod.id] = true;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

      console.log(`Successfully updated ${prod.id}.`);
    } catch (e) {
      console.error(`Error processing ${prod.id}:`, e);
      // We stop on error so we don't accidentally skip or fail silently
      process.exit(1);
    }
  }

  console.log("All products processed successfully!");
}

run();

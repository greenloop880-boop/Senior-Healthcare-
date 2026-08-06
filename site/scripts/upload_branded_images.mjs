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

const uploads = [
  { handle: 'nebulizer-machine', file: 'nebulizer_machine_branded.png' },
  { handle: 'neck-pillow', file: 'neck_pillow_branded.png' },
  { handle: 'one-touch-bp', file: 'one_touch_bp_branded.png' },
  { handle: 'pill-organizer', file: 'pill_organizer_branded.png' },
  { handle: 'shower-chair', file: 'shower_chair_branded.png' },
  { handle: 'wrist-bp', file: 'wrist_bp_branded.png' }
];

const artifactDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\172c5b46-ff8c-4d30-8472-b199420c11e5';

async function run() {
  for(let item of uploads) {
    const filePath = join(artifactDir, item.file);
    const fileContent = fs.readFileSync(filePath);
    const s3Key = `products/branded-${Date.now()}-${item.file}`;

    console.log(`Uploading ${item.file} to R2...`);
    await S3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'image/png'
    }));

    const finalUrl = `${PUBLIC_URL}/${s3Key}`;
    
    // Get existing product to update specs
    const { data: product } = await supabase.from('products').select('specs').eq('id', item.handle).single();
    let newSpecs = product?.specs || [];
    newSpecs = newSpecs.filter(s => !s.startsWith('__GALLERY__:'));

    console.log(`Updating Supabase for ${item.handle}...`);
    const { error } = await supabase.from('products').update({
      image_url: finalUrl,
      specs: newSpecs
    }).eq('id', item.handle);

    if(error) {
      console.error(`Failed to update ${item.handle}:`, error);
    } else {
      console.log(`Successfully updated ${item.handle} with ${finalUrl} and cleared gallery`);
    }
  }
  
  console.log("6 branded products updated successfully!");
}

run();

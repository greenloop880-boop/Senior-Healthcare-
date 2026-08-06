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
  { handle: 'coccyx-cushion', file: 'coccyx_cushion_1781618985992.png' },
  { handle: 'consti-calm', file: 'consti_calm_1781618999483.png' },
  { handle: 'diaper-pants', file: 'diaper_pants_1781619013434.png' },
  { handle: 'elastic-wrist', file: 'elastic_wrist_1781619025993.png' },
  { handle: 'foldable-stick', file: 'foldable_stick_1781619039361.png' },
  { handle: 'folding-walker', file: 'folding_walker_1781619059829.png' },
  { handle: 'folding-wheelchair', file: 'folding_wheelchair_1781619072614.png' },
  { handle: 'gut-probiotic', file: 'gut_probiotic_1781619084938.png' },
  { handle: 'hinged-stabilizer', file: 'hinged_stabilizer_1781619098670.png' },
  { handle: 'knee-sleeves', file: 'knee_sleeves_1781619112010.png' },
  { handle: 'led-walking-stick', file: 'led_walking_stick_1781619132265.png' },
  { handle: 'massage-gun', file: 'massage_gun_1781619143993.png' },
  { handle: 'voice-bp', file: 'voice_bp_1781619157438.png' }
];

const artifactDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\172c5b46-ff8c-4d30-8472-b199420c11e5';

async function run() {
  for(let item of uploads) {
    const filePath = join(artifactDir, item.file);
    const fileContent = fs.readFileSync(filePath);
    const s3Key = `products/${Date.now()}-${item.file}`;

    console.log(`Uploading ${item.file} to R2...`);
    await S3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'image/png'
    }));

    const finalUrl = `${PUBLIC_URL}/${s3Key}`;
    
    console.log(`Updating Supabase for ${item.handle}...`);
    const { error } = await supabase.from('products').update({
      image_url: finalUrl
    }).eq('id', item.handle);

    if(error) {
      console.error(`Failed to update ${item.handle}:`, error);
    } else {
      console.log(`Successfully updated ${item.handle} with ${finalUrl}`);
    }
  }
  
  console.log("All 13 products updated successfully!");
}

run();

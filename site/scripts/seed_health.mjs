import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.VITE_CLOUDFLARE_R2_BUCKET || 'storage';
const PUBLIC_URL = process.env.VITE_CLOUDFLARE_R2_PUBLIC_URL;

const jointReview = {
  title: "Joint Health Assessment",
  image: "https://picsum.photos/seed/img27/1000/1400",
  description: "Analyze your flexibility, balance, and joint strain markers to receive custom mobility care recommendations.",
  tag: "Mobility Care",
  link: "/self-assessment-page/knee-pain",
  quizId: "joint"
};

async function uploadImageToR2(imageUrl, folder) {
  if (!imageUrl) return null;
  console.log(`Downloading ${imageUrl}...`);
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: 'image/jpeg'
  }));

  return `${PUBLIC_URL}/${filename}`;
}

async function seedData() {
  console.log("Seeding remaining Health Review...");
  const imgUrl = await uploadImageToR2(jointReview.image, 'health');
  
  await supabase.from('health_reviews').insert({
    title: jointReview.title,
    image_url: imgUrl,
    description: jointReview.description,
    tag: jointReview.tag,
    link: jointReview.link,
    quiz_id: jointReview.quizId
  });

  console.log("Missing Database entry seeded successfully!");
}

seedData().catch(console.error);

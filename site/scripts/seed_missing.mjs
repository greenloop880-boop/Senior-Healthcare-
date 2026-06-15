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

const communityVideos = [
  {
    id: "gut-nutrition",
    title: "Gut Balance by Senior Anandam",
    bgImage: "https://picsum.photos/seed/img32/720/1280",
    overlayText: "That's exactly why Senior Anandam partnered with Wellbeing Nutrition",
    youtubeId: "L_xHlE9kF_Y",
    productImg: "https://picsum.photos/seed/img33/160/160"
  },
  {
    id: "zeenat-massage",
    title: "Relief Compact Massage Gun (Black) by Senior Anandam",
    bgImage: "https://picsum.photos/seed/img34/720/1280",
    overlayText: "Zeenat Aman\nActress",
    youtubeId: "T-h1Z9KzPz0",
    productImg: "https://picsum.photos/seed/img35/160/160"
  },
  {
    id: "diaper-pants",
    title: "Senior Anandam Adult Diaper Pants (with Smart Liquid ...",
    bgImage: "https://picsum.photos/seed/img36/720/1280",
    overlayText: "Premium absorbency for full daily mobility",
    youtubeId: "_lQ_M8Xh4lE",
    productImg: "https://picsum.photos/seed/img37/160/160"
  }
];

const premiumCustomerReviews = [
  {
    title: "A very handy and easy to use product",
    text: "The wheelchair is quite handy, easy to fold, and easy for elderly people to understand and use. It is made of high-quality materials and is overall a value-for-money product. There are no issues with portability. Recently, my grandmother used it and travelled to Delhi with it. She faced absolutely no problems.",
    author: "Debasis Mishra",
    productIcon: "https://picsum.photos/seed/img42/240/240",
    bgImage: "https://picsum.photos/seed/img43/800/1000",
    stars: 5
  },
  {
    title: "An excellent addition to our household",
    text: "I purchased the Senior Anandam Nebulizing Machine, and it’s been an excellent addition to our household. It’s easy to use, and the storage compartment keeps everything organized. It comes with two masks, a mouthpiece, and extra filters — perfect for both kids and adults.",
    author: "Sachin Patel",
    productIcon: "https://picsum.photos/seed/img44/240/240",
    bgImage: "https://picsum.photos/seed/img45/800/1000",
    stars: 5
  }
];

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
  console.log("Seeding remaining Community Videos...");
  for (let video of communityVideos) {
    const bgUrl = await uploadImageToR2(video.bgImage, 'community');
    const prodUrl = await uploadImageToR2(video.productImg, 'community');
    await supabase.from('community_videos').insert({
      id: video.id,
      title: video.title,
      bg_image_url: bgUrl,
      product_img_url: prodUrl,
      overlay_text: video.overlayText,
      youtube_id: video.youtubeId
    });
  }

  console.log("Seeding remaining Customer Reviews...");
  for (let cr of premiumCustomerReviews) {
    const iconUrl = await uploadImageToR2(cr.productIcon, 'reviews');
    const bgUrl = await uploadImageToR2(cr.bgImage, 'reviews');
    await supabase.from('customer_reviews').insert({
      title: cr.title,
      text: cr.text,
      author: cr.author,
      product_icon_url: iconUrl,
      bg_image_url: bgUrl,
      stars: cr.stars
    });
  }

  console.log("Missing Database entries seeded successfully!");
}

seedData().catch(console.error);

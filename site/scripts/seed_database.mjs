import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { IMAGES, PRODUCTS_DATA } from '../src/config/images.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const s3Client = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
}) : null;

const R2_PUBLIC_URL = process.env.VITE_CLOUDFLARE_R2_PUBLIC_URL;
const BUCKET = process.env.VITE_CLOUDFLARE_R2_BUCKET || 'storage';

async function uploadToR2(imageUrl, folder) {
  if (!s3Client) return imageUrl;
  try {
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: 'image/jpeg'
    }));

    return `${R2_PUBLIC_URL}/${filename}`;
  } catch (err) {
    console.error(`Failed to upload ${imageUrl}:`, err.message);
    return imageUrl; 
  }
}

async function insertData(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    console.error(`Error inserting into ${table}:`, await res.text());
  }
}

async function seed() {
  console.log('--- Starting Database Seeding ---');

  console.log('Seeding Categories...');
  for (const cat of IMAGES.categories) {
    console.log(`Uploading image for category: ${cat.title}`);
    const r2Url = await uploadToR2(cat.image, 'categories');
    await insertData('categories', {
      title: cat.title,
      image_url: r2Url,
      link: cat.link
    });
  }

  console.log('Seeding Concerns...');
  for (const concern of IMAGES.concerns) {
    console.log(`Uploading image for concern: ${concern.title}`);
    const r2Url = await uploadToR2(concern.image, 'concerns');
    await insertData('concerns', {
      title: concern.title,
      image_url: r2Url,
      link: concern.link
    });
  }

  console.log('Seeding Products...');
  for (const [categoryTitle, products] of Object.entries(PRODUCTS_DATA)) {
    for (const prod of products) {
      console.log(`Uploading image for product: ${prod.title}`);
      const r2Url = await uploadToR2(prod.image, 'products');
      await insertData('products', {
        id: prod.id,
        category_title: categoryTitle,
        title: prod.title,
        description: prod.description,
        price: prod.price,
        mrp: prod.mrp,
        discount: prod.discount,
        rating: prod.rating,
        reviews_count: prod.reviewsCount,
        image_url: r2Url,
        specs: prod.specs
      });
    }
  }



  console.log('--- Seeding Completed! ---');
}

seed();

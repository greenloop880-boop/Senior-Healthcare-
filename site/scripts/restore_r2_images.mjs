import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', 'admin', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function getR2FilesByFolder(folder) {
  try {
    const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: folder + '/' });
    const response = await s3Client.send(command);
    if (!response.Contents) return [];
    // Sort chronologically based on filename timestamp or LastModified
    return response.Contents.sort((a, b) => a.LastModified - b.LastModified).map(item => `${PUBLIC_URL}/${item.Key}`);
  } catch (err) {
    console.error(`Error listing R2 files for ${folder}:`, err);
    return [];
  }
}

async function restore() {
  console.log('--- Starting R2 Image Restoration ---');

  // Categories
  console.log('Restoring Categories...');
  const catFiles = await getR2FilesByFolder('categories');
  const { data: categories } = await supabase.from('categories').select('id').order('id', { ascending: true });
  if (categories) {
    for (let i = 0; i < categories.length; i++) {
      if (catFiles[i]) {
        await supabase.from('categories').update({ image_url: catFiles[i] }).eq('id', categories[i].id);
      }
    }
  }

  // Concerns
  console.log('Restoring Concerns...');
  const concernFiles = await getR2FilesByFolder('concerns');
  const { data: concerns } = await supabase.from('concerns').select('id').order('id', { ascending: true });
  if (concerns) {
    for (let i = 0; i < concerns.length; i++) {
      if (concernFiles[i]) {
        await supabase.from('concerns').update({ image_url: concernFiles[i] }).eq('id', concerns[i].id);
      }
    }
  }

  // Products
  console.log('Restoring Products...');
  const prodFiles = await getR2FilesByFolder('products');
  const { data: products } = await supabase.from('products').select('id').order('id', { ascending: true });
  if (products) {
    for (let i = 0; i < products.length; i++) {
      if (prodFiles[i]) {
        await supabase.from('products').update({ image_url: prodFiles[i] }).eq('id', products[i].id);
      }
    }
  }

  // Hero Banners
  console.log('Restoring Hero Banners...');
  const heroFiles = await getR2FilesByFolder('hero');
  const { data: heroBanners } = await supabase.from('hero_banners').select('id').order('id', { ascending: true });
  if (heroBanners) {
    let fileIdx = 0;
    for (let i = 0; i < heroBanners.length; i++) {
      if (heroFiles[fileIdx] && heroFiles[fileIdx+1]) {
        await supabase.from('hero_banners').update({ 
          image_url: heroFiles[fileIdx],
          mobile_image_url: heroFiles[fileIdx+1]
        }).eq('id', heroBanners[i].id);
        fileIdx += 2;
      }
    }
  }

  // Health Reviews
  console.log('Restoring Health Reviews...');
  const healthFiles = await getR2FilesByFolder('health');
  const { data: healthReviews } = await supabase.from('health_reviews').select('id').order('id', { ascending: true });
  if (healthReviews) {
    for (let i = 0; i < healthReviews.length; i++) {
      if (healthFiles[i]) {
        await supabase.from('health_reviews').update({ image_url: healthFiles[i] }).eq('id', healthReviews[i].id);
      }
    }
  }

  // Community Videos
  console.log('Restoring Community Videos...');
  const commFiles = await getR2FilesByFolder('community');
  const { data: communityVideos } = await supabase.from('community_videos').select('id').order('id', { ascending: true });
  if (communityVideos) {
    let fileIdx = 0;
    for (let i = 0; i < communityVideos.length; i++) {
      if (commFiles[fileIdx] && commFiles[fileIdx+1]) {
        await supabase.from('community_videos').update({ 
          bg_image_url: commFiles[fileIdx],
          product_img_url: commFiles[fileIdx+1]
        }).eq('id', communityVideos[i].id);
        fileIdx += 2;
      }
    }
  }

  // Customer Reviews
  console.log('Restoring Customer Reviews...');
  const reviewFiles = await getR2FilesByFolder('reviews');
  const { data: customerReviews } = await supabase.from('customer_reviews').select('id').order('id', { ascending: true });
  if (customerReviews) {
    let fileIdx = 0;
    for (let i = 0; i < customerReviews.length; i++) {
      if (reviewFiles[fileIdx] && reviewFiles[fileIdx+1]) {
        await supabase.from('customer_reviews').update({ 
          product_icon_url: reviewFiles[fileIdx],
          bg_image_url: reviewFiles[fileIdx+1]
        }).eq('id', customerReviews[i].id);
        fileIdx += 2;
      }
    }
  }
  
  // Blogs
  console.log('Restoring Blogs...');
  const blogFiles = await getR2FilesByFolder('blogs');
  const { data: blogs } = await supabase.from('blogs').select('id').eq('author', 'Admin').order('id', { ascending: true });
  if (blogs) {
    for (let i = 0; i < blogs.length; i++) {
      if (blogFiles[i]) {
        await supabase.from('blogs').update({ image_url: blogFiles[i] }).eq('id', blogs[i].id);
      }
    }
  }

  console.log('--- Restoration Completed! ---');
}

restore().catch(console.error);

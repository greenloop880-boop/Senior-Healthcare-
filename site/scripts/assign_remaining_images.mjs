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

async function run() {
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'products/' });
  const response = await s3Client.send(command);
  const r2Images = (response.Contents || []).sort((a, b) => a.LastModified - b.LastModified).map(img => `${PUBLIC_URL}/${img.Key}`);
  
  const { data: products } = await supabase.from('products').select('*').order('id', { ascending: true });

  let unassignedImages = [...r2Images];

  for(let prod of products) {
    const mainImg = prod.image_url;
    unassignedImages = unassignedImages.filter(img => img !== mainImg);
  }

  console.log(`Found ${unassignedImages.length} unassigned images. Distributing them to products as gallery images...`);

  let imgIdx = 0;
  for(let prod of products) {
    let gallery = [];
    // Assign 2 images to each product if available
    if(unassignedImages[imgIdx]) gallery.push(unassignedImages[imgIdx++]);
    if(unassignedImages[imgIdx]) gallery.push(unassignedImages[imgIdx++]);
    
    if(gallery.length > 0) {
      // we need to add gallery to specs array
      let newSpecs = prod.specs || [];
      // Remove existing gallery string if any
      newSpecs = newSpecs.filter(s => !s.startsWith('__GALLERY__:'));
      
      // We must pad gallery to 4 items because admin panel expects ['', '', '', '']
      while(gallery.length < 4) gallery.push('');
      
      newSpecs.push(`__GALLERY__:${JSON.stringify(gallery)}`);
      
      await supabase.from('products').update({ specs: newSpecs }).eq('id', prod.id);
      console.log(`Updated ${prod.title} with 2 gallery images.`);
    }
  }

  // Any left?
  while(imgIdx < unassignedImages.length) {
    console.log(`Image leftover: ${unassignedImages[imgIdx]}`);
    imgIdx++;
  }
}

run();

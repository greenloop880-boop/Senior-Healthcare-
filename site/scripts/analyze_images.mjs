import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
  const r2Images = (response.Contents || []).sort((a, b) => a.LastModified - b.LastModified);
  
  const { data: products } = await supabase.from('products').select('*').order('id', { ascending: true });

  let md = `# Image Analysis Report\n\n`;
  
  md += `## Available images in Cloudflare R2 (Products Folder)\n\n`;
  md += `Total images: ${r2Images.length}\n\n`;
  md += `| File Name | Size (Bytes) | Last Modified |\n`;
  md += `|---|---|---|\n`;
  for(let img of r2Images) {
    md += `| ${img.Key} | ${img.Size} | ${img.LastModified.toISOString()} |\n`;
  }
  md += `\n`;

  md += `## Current Assigned Images & Mapping\n\n`;
  md += `| Product Title | Product ID / SKU | Current Main Image | Detail Banners | Gallery Images |\n`;
  md += `|---|---|---|---|---|\n`;

  let unassignedImages = r2Images.map(img => `${PUBLIC_URL}/${img.Key}`);
  let productsWithoutImages = [];

  for(let prod of products) {
    const mainImg = prod.image_url;
    const detail = prod.detail_banners || [];
    const gallery = prod.gallery_images || []; // actually stored in specs array
    
    // Check if gallery is in specs
    let parsedGallery = [];
    if(prod.specs) {
      for(let s of prod.specs) {
        if(s.startsWith('__GALLERY__:')) {
          try { parsedGallery = JSON.parse(s.replace('__GALLERY__:', '')); } catch(e){}
        }
      }
    }

    const allProdImages = [mainImg, ...detail, ...parsedGallery].filter(x => x);
    unassignedImages = unassignedImages.filter(img => !allProdImages.includes(img));

    if(!mainImg) {
      productsWithoutImages.push(prod);
    }

    md += `| ${prod.title} | ${prod.id} | ${mainImg ? '[Image]('+mainImg+')' : 'None'} | ${detail.filter(x=>x).length} | ${parsedGallery.filter(x=>x).length} |\n`;
  }

  md += `\n## Products without matching images\n\n`;
  if(productsWithoutImages.length === 0) md += `All products have at least a main image assigned.\n`;
  else {
    for(let p of productsWithoutImages) {
      md += `- ${p.title} (${p.id})\n`;
    }
  }

  md += `\n## Images not assigned to a product properly\n\n`;
  if(unassignedImages.length === 0) md += `All R2 images are currently mapped to a product.\n`;
  else {
    md += `There are ${unassignedImages.length} images not mapped to any product property (main image, detail banner, or gallery).\n\n`;
    for(let img of unassignedImages) {
      md += `- [${img.split('/').pop()}](${img})\n`;
    }
  }

  fs.writeFileSync('image_analysis_report.md', md);
  console.log("Report generated at image_analysis_report.md");
}

run();

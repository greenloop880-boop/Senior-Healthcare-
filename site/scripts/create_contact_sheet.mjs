import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', 'admin', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: products } = await supabase.from('products').select('*').order('id', { ascending: true });

  const imagesToFetch = new Map(); // url -> id
  
  let prodIdx = 1;
  const productData = [];
  
  for(let prod of products) {
    const mainImg = prod.image_url;
    
    // Check gallery
    let parsedGallery = [];
    if(prod.specs) {
      for(let s of prod.specs) {
        if(s.startsWith('__GALLERY__:')) {
          try { parsedGallery = JSON.parse(s.replace('__GALLERY__:', '')); } catch(e){}
        }
      }
    }
    
    const allImgs = [mainImg, ...parsedGallery].filter(x => x);
    
    const assignedIds = [];
    for(let img of allImgs) {
      if(!imagesToFetch.has(img)) {
        imagesToFetch.set(img, `IMG_${imagesToFetch.size + 1}`);
      }
      assignedIds.push(imagesToFetch.get(img));
    }
    
    productData.push({
      id: prod.id,
      title: prod.title,
      images: assignedIds
    });
  }
  
  fs.writeFileSync('product_audit_data.json', JSON.stringify(productData, null, 2));
  console.log(`Saved product_audit_data.json`);
  
  console.log(`Fetching ${imagesToFetch.size} unique images...`);
  
  const tileWidth = 300;
  const tileHeight = 350; // extra 50 for text
  const cols = 8;
  const rows = Math.ceil(imagesToFetch.size / cols);
  
  const gridWidth = cols * tileWidth;
  const gridHeight = rows * tileHeight;
  
  const composites = [];
  
  let idx = 0;
  for(let [url, imgId] of imagesToFetch.entries()) {
    try {
      console.log(`Fetching ${imgId}...`);
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      
      const resized = await sharp(buffer)
        .resize(tileWidth, tileWidth - 50, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toBuffer();
        
      // Create a tile with text
      const svgText = `
        <svg width="${tileWidth}" height="${tileHeight}">
          <rect width="100%" height="100%" fill="white"/>
          <text x="50%" y="${tileHeight - 20}" font-size="24" font-family="Arial" font-weight="bold" text-anchor="middle" fill="black">${imgId}</text>
        </svg>
      `;
      
      const textBuffer = Buffer.from(svgText);
      const tile = await sharp(textBuffer)
        .composite([{ input: resized, top: 0, left: 0 }])
        .png()
        .toBuffer();
        
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      
      composites.push({
        input: tile,
        top: row * tileHeight,
        left: col * tileWidth
      });
      
    } catch(err) {
      console.error(`Failed to fetch ${url}`, err);
    }
    idx++;
  }
  
  console.log("Generating grid image...");
  await sharp({
    create: {
      width: gridWidth,
      height: gridHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite(composites)
  .jpeg({ quality: 80 })
  .toFile('contact_sheet.jpg');
  
  console.log(`Generated contact_sheet.jpg with ${composites.length} images.`);
}

run();

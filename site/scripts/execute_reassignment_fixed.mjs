import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', 'admin', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const proposedMappings = {
  "ankle-brace": { mainImg: 20, gallery: [21, 23, 24, 26, 27, 29, 30] },
  "arm-bp": { mainImg: 45, gallery: [47, 49, 52] },
  "grab-bar": { mainImg: 3, gallery: [32, 33, 35, 36] },
  "lumbar-support": { mainImg: 38, gallery: [39, 41, 42, 44] },
  "nebulizer-machine": { mainImg: 8, gallery: [9, 11, 12, 14, 15, 17, 18] },
  "neck-pillow": { mainImg: 6, gallery: [57] },
  "one-touch-bp": { mainImg: 53, gallery: [54] },
  "pill-organizer": { mainImg: 55, gallery: [] },
  "shower-chair": { mainImg: 2, gallery: [5, 56] },
  "wrist-bp": { mainImg: 50, gallery: [51] }
};

async function run() {
  const backupData = JSON.parse(fs.readFileSync('backup_product_images.json', 'utf8'));

  // Reconstruct the IMG_X to URL mapping
  const urlToId = new Map();
  const idToUrl = new Map();
  
  for(let p of backupData) {
    const mainImg = p.image_url;
    let parsedGallery = [];
    if(p.specs) {
      for(let s of p.specs) {
        if(s.startsWith('__GALLERY__:')) {
          try { parsedGallery = JSON.parse(s.replace('__GALLERY__:', '')); } catch(e){}
        }
      }
    }
    
    const allImgs = [mainImg, ...parsedGallery].filter(x => x);
    for(let img of allImgs) {
      if(!urlToId.has(img)) {
        const newId = urlToId.size + 1;
        urlToId.set(img, newId);
        idToUrl.set(newId, img);
      }
    }
  }

  const { data: products, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if(error) {
    console.error("Failed to fetch products:", error);
    process.exit(1);
  }

  const completionReport = [];

  for(let p of products) {
    const prevMain = p.image_url;
    let status = '';
    let newMain = null;
    let newGalleryUrls = [];
    
    if (proposedMappings[p.id]) {
      const mapping = proposedMappings[p.id];
      newMain = idToUrl.get(mapping.mainImg);
      newGalleryUrls = mapping.gallery.map(idx => idToUrl.get(idx)).filter(x => x);
      
      const paddedGalleryUrls = [...newGalleryUrls];
      while(paddedGalleryUrls.length < 4) paddedGalleryUrls.push('');
      if(paddedGalleryUrls.length > 4) paddedGalleryUrls.length = 4;
      
      let newSpecs = p.specs || [];
      newSpecs = newSpecs.filter(s => !s.startsWith('__GALLERY__:'));
      if(newGalleryUrls.length > 0) {
        newSpecs.push(`__GALLERY__:${JSON.stringify(paddedGalleryUrls)}`);
      }
      
      await supabase.from('products').update({
        image_url: newMain,
        specs: newSpecs
      }).eq('id', p.id);
      
      status = 'Updated';
    } else {
      let newSpecs = p.specs || [];
      newSpecs = newSpecs.filter(s => !s.startsWith('__GALLERY__:'));
      
      await supabase.from('products').update({
        image_url: null,
        specs: newSpecs
      }).eq('id', p.id);
      
      status = 'Missing Images';
    }
    
    completionReport.push({
      title: p.title,
      handle: p.id,
      prevMain: prevMain,
      newMain: newMain,
      gallery: newGalleryUrls,
      status: status
    });
    
    console.log(`Processed ${p.id} -> ${status}`);
  }
  
  fs.writeFileSync('completion_report.json', JSON.stringify(completionReport, null, 2));
  console.log("Reassignment completed. Wrote completion_report.json");
}

run();

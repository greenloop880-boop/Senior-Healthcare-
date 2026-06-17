import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', 'admin', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) {
    console.error("Failed to fetch products:", error);
    process.exit(1);
  }

  let allValid = true;
  for (const prod of products) {
    const banners = prod.detail_banners || [];
    let galleryCount = 0;
    if (prod.specs) {
      const gallerySpec = prod.specs.find(s => s.startsWith('__GALLERY__:'));
      if (gallerySpec) {
        try {
          const parsed = JSON.parse(gallerySpec.replace('__GALLERY__:', ''));
          galleryCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch(e) {}
      }
    }

    if (banners.length !== 4 || galleryCount !== 4) {
      console.error(`Mismatch for ${prod.id}: Banners=${banners.length}, Gallery=${galleryCount}`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log(`Verification Passed! All ${products.length} products have exactly 4 gallery images and 4 detail banners.`);
  } else {
    console.log("Verification Failed. Some products have missing images.");
  }
}

run();

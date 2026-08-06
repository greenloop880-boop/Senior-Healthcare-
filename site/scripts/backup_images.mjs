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

async function run() {
  const { data: products, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if(error) {
    console.error("Failed to fetch products:", error);
    process.exit(1);
  }

  // Backup current assignments
  const backupData = products.map(p => ({
    id: p.id,
    title: p.title,
    image_url: p.image_url,
    specs: p.specs
  }));
  
  fs.writeFileSync('backup_product_images.json', JSON.stringify(backupData, null, 2));
  console.log(`Backed up ${backupData.length} product image assignments to backup_product_images.json`);
}

run();

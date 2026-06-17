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
  const backupData = JSON.parse(fs.readFileSync('backup_product_images.json', 'utf8'));

  for(let p of backupData) {
    const { error } = await supabase.from('products').update({
      image_url: p.image_url,
      specs: p.specs
    }).eq('id', p.id);
    
    if(error) {
      console.error(`Failed to restore ${p.id}:`, error);
    } else {
      console.log(`Restored ${p.id}`);
    }
  }
  
  console.log("Restore complete.");
}

run();

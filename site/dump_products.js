import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wsrcolrvkizpcgmvrgiw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: products, error } = await supabase.from('products').select('id, title').order('id', { ascending: true });
  if (error) {
    console.error("Error fetching products:", error);
    return;
  }
  fs.writeFileSync('all_products.json', JSON.stringify(products, null, 2));
  console.log(`Saved ${products.length} products to all_products.json`);
}

run();

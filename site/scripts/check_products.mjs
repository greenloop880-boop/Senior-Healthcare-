import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: products } = await supabase.from('products').select('id, title, category_title');
  const { data: categories } = await supabase.from('categories').select('id, title');
  const { data: concerns } = await supabase.from('concerns').select('id, title');
  
  const productCats = new Set(products.map(p => p.category_title).filter(Boolean));
  console.log("Product categories:", Array.from(productCats));
  
  const missingCats = categories.map(c => c.title).filter(c => !productCats.has(c));
  if (missingCats.length > 0) {
    console.log("Categories with no products:", missingCats);
  }
}
run();

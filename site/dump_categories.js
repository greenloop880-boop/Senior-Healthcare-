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
  const { data: categories, error } = await supabase.from('categories').select('id, title').order('id', { ascending: true });
  if (error) {
    console.error("Error fetching categories:", error);
    return;
  }
  fs.writeFileSync('all_categories.json', JSON.stringify(categories, null, 2));
  console.log(`Saved ${categories.length} categories to all_categories.json`);
}

run();

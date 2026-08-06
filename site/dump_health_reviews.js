import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wsrcolrvkizpcgmvrgiw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: reviews, error } = await supabase.from('health_reviews').select('*').order('id', { ascending: true });
  if (error) {
    console.error("Error fetching health_reviews:", error);
    return;
  }
  console.log(JSON.stringify(reviews, null, 2));
}

run();

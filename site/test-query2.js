import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('products').select(`
    name,
    skus ( selling_price, mrp )
  `).limit(5);
  console.log(JSON.stringify(data, null, 2), error);
}

check();

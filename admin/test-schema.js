import { supabase } from './src/config/supabaseClient.js';

async function test() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

test();

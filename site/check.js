import { supabase } from './src/config/supabaseClient.js';

async function check() {
  const { data } = await supabase.from('products').select('*').limit(1);
  console.log(Object.keys(data[0]));
  process.exit(0);
}
check();

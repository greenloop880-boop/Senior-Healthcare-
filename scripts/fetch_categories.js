const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../admin/.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      envVars[key.trim()] = values.join('=').trim();
    }
  }
});

const supabase = createClient(
  envVars['VITE_SUPABASE_URL'],
  envVars['VITE_SUPABASE_ANON_KEY']
);

async function fetchCategories() {
  const { data: prods, error: err3 } = await supabase.from('products').select('*').limit(1);
  console.log('Product Keys:', Object.keys(prods[0]));
}

fetchCategories();

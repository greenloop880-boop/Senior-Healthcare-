import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testOrder() {
  console.log("Logging in...");
  // Let's use the OTP or maybe we can't log in...
  // Since we don't have a valid OTP, we can't sign in here easily.
  // BUT we can use the VITE_SUPABASE_ANON_KEY and maybe there's a user we know?
  // Let's just query orders for ANY user to see the columns.
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  console.log("Orders:", data);
}

testOrder();

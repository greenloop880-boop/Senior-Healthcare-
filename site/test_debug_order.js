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

async function debugOrder() {
  console.log("Creating temp user...");
  const email = `testuser_${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
  });
  
  if (authError) {
    console.error("SignUp error:", authError);
    return;
  }
  
  const userId = authData.user.id;
  console.log("Created User ID:", userId);

  console.log("Attempting to insert order...");
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{ customer_id: userId, status: 'PENDING', total_amount: 1500 }])
    .select()
    .single();
    
  if (orderError) {
    console.error("Order Insert Error details:", JSON.stringify(orderError, null, 2));
  } else {
    console.log("Order Insert Success:", order);
    
    console.log("Cleaning up temp user...");
    // Just a test, no need to fully clean up if we can't easily
  }
}

debugOrder();

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

async function testInsert() {
  // Try signing up or signing in
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  });
  if (authError) {
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123'
      });
      authData = signupData;
  }
  
  if (!authData?.user) {
      console.log('Auth failed', authError);
      return;
  }
  
  const userId = authData.user.id;
  console.log('Logged in as:', userId);

  const { data, error } = await supabase.from('orders').insert([{ customer_id: userId, status: 'PENDING', total_amount: 100 }]).select().single();
  console.log('Data:', data);
  console.log('Error:', error);
}

testInsert();

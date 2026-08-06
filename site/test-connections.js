import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runTests() {
  console.log('--- Testing Connections (Using raw fetch) ---');

  // 1. Supabase Test
  console.log('\n1. Testing Supabase...');
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (res.ok) {
      console.log('✅ Supabase connected successfully! (REST API reachable)');
    } else {
      console.log('❌ Supabase check failed:', res.status, res.statusText);
      const text = await res.text();
      console.log('Response:', text);
    }
  } catch (err) {
    console.log('❌ Supabase test failed with exception:', err.message);
  }

  // 2. Cloudflare R2 Test
  console.log('\n2. Testing Cloudflare R2...');
  try {
    const r2Url = process.env.VITE_CLOUDFLARE_R2_PUBLIC_URL;
    if (r2Url) {
      const res = await fetch(r2Url);
      if (res.status === 200 || res.status === 403 || res.status === 404) {
        console.log(`✅ Cloudflare R2 public URL is reachable! (Status: ${res.status})`);
      } else {
        console.log('❌ Cloudflare R2 check returned unexpected status:', res.status);
      }
    } else {
      console.log('⚠️ No public R2 URL found.');
    }
  } catch (err) {
    console.log('❌ Cloudflare R2 test failed with exception:', err.message);
  }
}

runTests();

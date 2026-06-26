import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const userId = 'test-user-123';
  const payload = {
    id: `profile-${userId}`,
    title: `Test Name`,
    summary: 'test@example.com',
    date: new Date().toISOString(),
    read_time: 'male',
    author: 'SYSTEM_USER_PROFILE',
    image_url: '',
    content: { firstName: 'Test', lastName: 'Name' }
  };
  
  console.log('Inserting...');
  const { data, error } = await supabase.from('blogs').upsert([payload]);
  console.log('Insert result:', data, error);

  console.log('Fetching...');
  const { data: fetch1, error: err1 } = await supabase.from('blogs').select('*').eq('id', `profile-${userId}`);
  console.log('Fetch result:', fetch1, err1);

  console.log('Updating...');
  const { data: data2, error: err2 } = await supabase.from('blogs').upsert([{...payload, title: 'Updated Name'}]);
  console.log('Update result:', data2, err2);
  
  console.log('Fetching again...');
  const { data: fetch2, error: err3 } = await supabase.from('blogs').select('*').eq('id', `profile-${userId}`);
  console.log('Fetch again result:', fetch2, err3);
}

test();

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wsrcolrvkizpcgmvrgiw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcmNvbHJ2a2l6cGNnbXZyZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTYyNDAsImV4cCI6MjA5NjY3MjI0MH0.0Lp9NKKWI6GyJeuFUzKkFBR44sIjQnnEMWowZ3W0oFE'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1)
  if (error) {
    console.log(`Table ${table} Error:`, error.message)
  } else {
    console.log(`Table ${table} Success! Data:`, data)
  }
}

async function runAll() {
  await test('leads');
  await test('contacts');
  await test('contact_requests');
  await test('callback_requests');
  await test('help_requests');
}

runAll();

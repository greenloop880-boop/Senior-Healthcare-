import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wsrcolrvkizpcgmvrgiw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcmNvbHJ2a2l6cGNnbXZyZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTYyNDAsImV4cCI6MjA5NjY3MjI0MH0.0Lp9NKKWI6GyJeuFUzKkFBR44sIjQnnEMWowZ3W0oFE'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.from('callbacks').select('*').limit(1)
  if (error) {
    console.error("Error:", error)
  } else {
    console.log("Success! Data:", data)
  }
}

test()

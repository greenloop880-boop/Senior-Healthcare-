import pkg from 'pg';
const { Client } = pkg;

async function testDb() {
  console.log("Connecting to Postgres on port 6543...");
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com', // typical pooler for ap-south-1, but wait, we don't know the region. 
    // We can try db.wsrcolrvkizpcgmvrgiw.supabase.co on port 6543 first.
    host: 'db.wsrcolrvkizpcgmvrgiw.supabase.co',
    port: 6543,
    database: 'postgres',
    user: 'postgres.wsrcolrvkizpcgmvrgiw',
    password: 'Seniorhealth@#123',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to Supabase Postgres pooler!");
    
    // Read the schema file and execute
    const fs = await import('fs');
    const path = await import('path');
    const sql = fs.readFileSync(path.resolve('supabase/migrations/20260611_init_schema.sql'), 'utf8');
    
    await client.query(sql);
    console.log("Schema pushed successfully!");
  } catch (err) {
    console.log("Connection/Execution failed on 6543:", err.message);
  } finally {
    await client.end();
  }
}

testDb();

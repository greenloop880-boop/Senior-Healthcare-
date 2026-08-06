import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  console.log("Connecting to Postgres on port 6543...");
  const client = new Client({
    host: 'db.wsrcolrvkizpcgmvrgiw.supabase.co',
    port: 6543,
    database: 'postgres',
    user: 'postgres',
    password: 'Seniorhealth@#123',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to Supabase Postgres pooler!");
    
    const sql = fs.readFileSync(path.resolve('../supabase_orders_patch.sql'), 'utf8');
    
    await client.query(sql);
    console.log("Migration supabase_orders_patch.sql pushed successfully!");
  } catch (err) {
    console.log("Connection/Execution failed:", err.message);
  } finally {
    await client.end();
  }
}

applyMigration();

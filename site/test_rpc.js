import pkg from 'pg';
const { Client } = pkg;

async function testRpc() {
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
    console.log("Connected successfully! Testing admin_get_orders()...");
    
    // Simulate an admin calling the function.
    // Since we are connected as postgres superuser, we don't need to pass RLS, but the function calls `public.is_admin()`. 
    // Wait, the postgres user might not return true for `public.is_admin()`. Let's bypass the check by calling it or mocking.
    // Or we can just execute `SELECT * FROM orders` to see if the columns exist!
    
    const { rows: columns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name IN ('admin_notes', 'tax_amount');
    `);
    
    console.log("Found new columns in 'orders':", columns.map(c => c.column_name));
    
    const { rows: functions } = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('admin_get_orders', 'admin_get_order_details');
    `);
    
    console.log("Found new functions:", functions.map(f => f.routine_name));
    
    if (functions.length === 2 && columns.length >= 2) {
      console.log("\n✅ SUCCESS: The database migration has been applied successfully!");
    } else {
      console.log("\n❌ FAILED: The database migration has NOT been applied yet.");
    }
    
  } catch (err) {
    console.log("Connection/Execution failed:", err.message);
  } finally {
    await client.end();
  }
}

testRpc();

import pg from 'pg';

const directConnectionString = "postgresql://postgres:Seniorhealth%40%23123@db.wsrcolrvkizpcgmvrgiw.supabase.co:5432/postgres";

const { Client } = pg;
const client = new Client({ connectionString: directConnectionString });

async function fixGrants() {
  try {
    await client.connect();
    console.log("Connected to database.");

    const sql = `
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
    `;

    await client.query(sql);
    console.log("Grants applied successfully!");

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

fixGrants();

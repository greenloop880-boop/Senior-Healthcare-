import pg from 'pg';

const connectionString = "postgresql://postgres.wsrcolrvkizpcgmvrgiw:Seniorhealth%40%23123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

const { Client } = pg;
const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log("Connected to database.");

    const sql = `
      CREATE TABLE IF NOT EXISTS callbacks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          time_slot TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies if they exist (to avoid errors if run multiple times)
      DROP POLICY IF EXISTS "Allow public insert into callbacks" ON callbacks;
      DROP POLICY IF EXISTS "Allow anon insert callbacks" ON callbacks;
      DROP POLICY IF EXISTS "Allow public read access to callbacks" ON callbacks;

      -- Create Policies
      CREATE POLICY "Allow public insert into callbacks" ON callbacks FOR INSERT WITH CHECK (true);
      CREATE POLICY "Allow public read access to callbacks" ON callbacks FOR SELECT USING (true);
    `;

    await client.query(sql);
    console.log("Callbacks schema executed successfully!");

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();

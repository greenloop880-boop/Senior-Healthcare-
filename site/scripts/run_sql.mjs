import pg from 'pg';

const connectionString = "postgresql://postgres.wsrcolrvkizpcgmvrgiw:Seniorhealth@%23123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
// Note: Supabase pooler URL for project wsrcolrvkizpcgmvrgiw in India is usually aws-0-ap-south-1.pooler.supabase.com
// Let's try direct connection first to db.wsrcolrvkizpcgmvrgiw.supabase.co
const directConnectionString = "postgresql://postgres:Seniorhealth%40%23123@db.wsrcolrvkizpcgmvrgiw.supabase.co:5432/postgres";

const { Client } = pg;

const client = new Client({
  connectionString: directConnectionString,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to database.");

    const sql = `
      CREATE TABLE IF NOT EXISTS hero_banners (
          id SERIAL PRIMARY KEY,
          title TEXT,
          subtitle TEXT,
          image_url TEXT,
          mobile_image_url TEXT,
          link TEXT,
          bg_gradient TEXT
      );

      CREATE TABLE IF NOT EXISTS health_reviews (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          tag TEXT,
          link TEXT,
          quiz_id TEXT
      );

      CREATE TABLE IF NOT EXISTS community_videos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          bg_image_url TEXT,
          product_img_url TEXT,
          overlay_text TEXT,
          youtube_id TEXT
      );

      CREATE TABLE IF NOT EXISTS customer_reviews (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          text TEXT NOT NULL,
          author TEXT,
          product_icon_url TEXT,
          bg_image_url TEXT,
          stars INTEGER
      );
    `;

    await client.query(sql);
    console.log("SQL schema executed successfully!");

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();

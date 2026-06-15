import pkg from 'pg';
const { Client } = pkg;

const passwords = [
  'Seniorhealth@#123',
  'Seniorhealth@%23123',
  'Seniorhealth%40%23123',
  'Seniorhealth',
  'Seniorhealth#123',
  'Seniorhealth123',
  'Seniorhealth@123'
];

async function testPasswords() {
  for (const pw of passwords) {
    console.log(`Testing password: "${pw}"...`);
    const client = new Client({
      host: 'aws-0-ap-south-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.wsrcolrvkizpcgmvrgiw',
      password: pw,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log(`✅ Success with pooler user & password: "${pw}"!`);
      const res = await client.query('SELECT current_user;');
      console.log(res.rows[0]);
      await client.end();
      return;
    } catch (err) {
      console.log(`❌ Failed pooler: ${err.message}`);
    }
  }
}

testPasswords();

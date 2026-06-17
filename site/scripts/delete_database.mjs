import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const tables = [
  'products',
  'categories',
  'concerns',
  'hero_banners',
  'health_reviews',
  'community_videos',
  'customer_reviews',
  'announcements',
  'blogs',
  'leads',
  'contacts',
  'contact_requests',
  'callback_requests',
  'help_requests'
];

async function deleteAll() {
  console.log("Starting to delete all data from tables...");
  for (const table of tables) {
    try {
      // First, get all records to find their primary keys or just clear them
      // We will just try a generic delete using an always-true filter.
      // E.g., deleting all where title is not null OR id is not null. 
      // But we don't know the schema. Let's just use PostgREST's ability to delete with a broad filter.
      // A common one is matching anything by adding a query param. 
      // Actually, fetching all records and then deleting them one by one or by ID is safest if RLS allows it.
      
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (!res.ok) {
         console.log(`Failed to fetch ${table}:`, await res.text());
         continue;
      }
      
      const records = await res.json();
      if (records.length === 0) {
        console.log(`${table} is already empty.`);
        continue;
      }
      
      // Assume the first key of the first object is the primary key (usually 'id' or 'title' or 'name')
      const pk = Object.keys(records[0])[0];
      console.log(`Found ${records.length} records in ${table}. Primary key seems to be '${pk}'. Deleting...`);
      
      for (const record of records) {
         const pkValue = record[pk];
         const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${pk}=eq.${encodeURIComponent(pkValue)}`, {
           method: 'DELETE',
           headers: {
             'apikey': SUPABASE_KEY,
             'Authorization': `Bearer ${SUPABASE_KEY}`
           }
         });
         if (!deleteRes.ok) {
           console.log(`Failed to delete record ${pkValue} from ${table}:`, await deleteRes.text());
         }
      }
      console.log(`Cleared ${table}.`);
      
    } catch(err) {
      console.error(`Error on ${table}: ${err.message}`);
    }
  }
  console.log("Deletion process completed.");
}

deleteAll();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Using anon key for now (requires RLS bypass or logging in as admin)
// Wait, we need the SERVICE_ROLE_KEY to bypass RLS, OR we need to login as admin first.
// Let's just create a custom client and login.

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log("Starting Database Seed...");

  // 1. Authenticate as Admin (You will need to enter your credentials here if we didn't use a service role key)
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error("Please provide admin email and password as arguments:");
    console.error("node seedDatabase.js <email> <password>");
    process.exit(1);
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    console.error("Login failed:", authError.message);
    process.exit(1);
  }
  console.log("Logged in as Admin successfully.");

  // 2. Read Backup Data
  const backupPath = path.join(__dirname, '../../site/backup_product_images.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at ${backupPath}`);
    process.exit(1);
  }
  const rawData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  // 3. Create a Default Vendor & Warehouse
  console.log("Creating default Vendor and Warehouse...");
  const { data: vendor, error: vErr } = await supabase
    .from('vendors')
    .insert([{ name: 'Senior Anandam Default Vendor', contact_info: { email: 'vendor@senioranandam.com' } }])
    .select().single();
  if (vErr) {
    console.error("Vendor Insert Error:", vErr);
    process.exit(1);
  }

  const { data: warehouse, error: wErr } = await supabase
    .from('warehouses')
    .insert([{ name: 'Main Fulfillment Center', location_address: { city: 'Mumbai' } }])
    .select().single();
  if (wErr) {
    console.error("Warehouse Insert Error:", wErr);
    process.exit(1);
  }

  console.log("Importing Products...");
  for (const item of rawData) {
    let description = [];
    let gallery = [];
    
    // Parse specs for gallery
    if (item.specs) {
      for (const spec of item.specs) {
        if (spec.startsWith('__GALLERY__:')) {
          try {
            gallery = JSON.parse(spec.replace('__GALLERY__:', '')).filter(Boolean);
          } catch (e) {}
        } else {
          description.push(spec);
        }
      }
    }

    // A. Insert Product
    const { data: product, error: pErr } = await supabase
      .from('products')
      .insert([{
        vendor_id: vendor.id,
        name: item.title,
        description: description.join('\n'),
        image_url: item.image_url,
        images: gallery
      }])
      .select().single();
    if (pErr) { console.error("Error creating product:", pErr); continue; }

    // B. Insert SKU
    // Note: Since pricing wasn't in the JSON, we default to 999
    const { data: sku, error: sErr } = await supabase
      .from('skus')
      .insert([{
        product_id: product.id,
        sku_code: item.id.toUpperCase(),
        selling_price: 999.00,
        average_cost: 0.00 // Set via purchase transaction
      }])
      .select().single();
    if (sErr) { console.error("Error creating SKU:", sErr); continue; }

    // C. Add Initial Inventory via PURCHASE Transaction
    // This triggers update_moving_average_cost and process_inventory_transaction
    const { error: tErr } = await supabase
      .from('inventory_transactions')
      .insert([{
        sku_id: sku.id,
        warehouse_id: warehouse.id,
        transaction_type: 'PURCHASE',
        quantity_change: 100, // Default 100 stock
        unit_cost: 500.00,    // Default cost 500
        reference_type: 'MANUAL_ADJUSTMENT'
      }]);
    
    if (tErr) console.error("Error adding inventory for", item.title, ":", tErr);
    else console.log(`Imported: ${item.title}`);
  }

  console.log("Seed complete! You now have products and inventory.");
  process.exit(0);
}

seedDatabase();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function createTestOrder() {
  console.log("Creating Test Order...");
  
  // 1. Get a random SKU
  const { data: skus, error: skuError } = await supabase.from('skus').select('id, selling_price').limit(1);
  if (skuError || !skus.length) {
    console.error("Failed to fetch SKU:", skuError);
    return;
  }
  const sku = skus[0];
  console.log("Using SKU:", sku.id);

  // 2. Insert Order
  const { data: order, error: orderError } = await supabase.from('orders').insert({
    status: 'PENDING',
    total_amount: sku.selling_price * 2,
    admin_notes: 'Test Order via Script',
    tax_amount: 50,
    shipping_amount: 100,
    discount_amount: 0
  }).select().single();
  
  if (orderError) {
    console.error("Failed to create order:", orderError);
    return;
  }
  console.log("Created Order:", order.id);

  // 3. Insert Address
  await supabase.from('order_addresses').insert({
    order_id: order.id,
    address_type: 'SHIPPING',
    full_name: 'John Doe Testing',
    phone: '9876543210',
    address_line1: '123 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India'
  });

  // 4. Insert Order Items
  await supabase.from('order_items').insert({
    order_id: order.id,
    sku_id: sku.id,
    quantity: 2,
    unit_price: sku.selling_price,
    unit_cost: sku.selling_price * 0.5 // mock cost
  });

  // 5. Insert Payment
  await supabase.from('payments').insert({
    order_id: order.id,
    gateway: 'razorpay',
    amount: sku.selling_price * 2,
    status: 'CREATED'
  });

  console.log("Test Order completely inserted! Check the Admin UI now.");
}

createTestOrder();

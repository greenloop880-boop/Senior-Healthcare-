import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Fetching products...");
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories ( name ),
      skus ( id, sku_code, variant_name, selling_price, mrp, inventory(quantity_available) ),
      product_concerns ( concerns ( name ) )
    `)
    .eq('name', 'Dr Ortho Slipper for Women')

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", JSON.stringify(data, null, 2));
  }
}

test();

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Support trigger on 'orders' or 'payments' tables
    let orderId = payload.record?.id;
    if (payload.table === 'payments' && payload.record?.order_id) {
       orderId = payload.record?.order_id;
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "No order ID found in payload" }), { status: 400, headers: corsHeaders });
    }

    // Wait 2 seconds to ensure child records (addresses, items) are fully committed by Razorpay function
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch the full order details from DB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_addresses(*), order_items(*, skus(*, products(*))), payments(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found or incomplete");
    }

    // Authenticate with Shiprocket
    const srEmail = Deno.env.get('SHIPROCKET_EMAIL');
    const srPassword = Deno.env.get('SHIPROCKET_PASSWORD');
    
    if (!srEmail || !srPassword) {
      throw new Error("Shiprocket credentials (SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD) not configured");
    }

    const authRes = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: srEmail, password: srPassword })
    });
    
    const authData = await authRes.json();
    if (!authData.token) throw new Error("Shiprocket auth failed: " + JSON.stringify(authData));

    const srToken = authData.token;

    // Prepare Shiprocket Order Payload
    const address = order.order_addresses?.[0] || {};
    const payment = order.payments?.[0] || {};
    const items = order.order_items || [];

    const orderItems = items.map((item: any) => {
      const productName = item.skus?.products?.name || "Product";
      const variantName = item.skus?.variant_name ? ` (${item.skus.variant_name})` : "";
      
      return {
        name: productName + variantName,
        sku: item.skus?.sku_code || item.sku_id,
        units: item.quantity,
        selling_price: item.unit_price,
        discount: 0,
        tax: 0,
        hsn: ""
      };
    });

    // Fetch customer email from auth.users
    let billingEmail = "customer@example.com";
    if (order.customer_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(order.customer_id);
      if (userData?.user?.email) {
        billingEmail = userData.user.email;
      }
    }

    const orderPayload = {
      order_id: order.id, // Full UUID to match incoming webhooks
      order_date: new Date(order.created_at).toISOString().split('T')[0],
      pickup_location: "warehouse",
      billing_customer_name: address.full_name?.split(' ')[0] || "Customer",
      billing_last_name: address.full_name?.split(' ').slice(1).join(' ') || "",
      billing_address: address.address_line1 || "N/A",
      billing_address_2: address.address_line2 || "",
      billing_city: address.city || "Unknown",
      billing_pincode: address.pincode || "110001",
      billing_state: address.state || "Unknown",
      billing_country: "India",
      billing_email: billingEmail, // Fetch from auth if available
      billing_phone: address.phone || "9999999999",
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: payment.gateway === 'razorpay' ? 'Prepaid' : 'COD',
      sub_total: order.total_amount,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5
    };

    const createOrderRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${srToken}`
      },
      body: JSON.stringify(orderPayload)
    });

    const createOrderData = await createOrderRes.json();

    return new Response(JSON.stringify({ success: true, shiprocketResponse: createOrderData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

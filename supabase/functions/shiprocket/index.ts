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

    // Authenticate with Shiprocket (shared for all actions)
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

    // ─── ACTION: sync_tracking ────────────────────────────────────────────────
    // Fetches tracking/courier/AWB from Shiprocket for a given order_id and
    // writes it back to our shipments table.
    if (payload.action === 'sync_tracking') {
      const orderId = payload.order_id;
      if (!orderId) {
        return new Response(JSON.stringify({ error: "No order_id provided" }), { status: 400, headers: corsHeaders });
      }

      // Fetch shipment details from Shiprocket using our order_id as channel_order_id
      const srOrderRes = await fetch(
        `https://apiv2.shiprocket.in/v1/external/orders?channel_order_id=${orderId}`,
        { headers: { "Authorization": `Bearer ${srToken}` } }
      );
      const srOrderData = await srOrderRes.json();

      // Shiprocket returns { data: [...] }
      const srOrders = srOrderData?.data || [];
      if (!srOrders.length) {
        return new Response(JSON.stringify({
          success: false,
          message: "No matching order found in Shiprocket for this order ID"
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const srOrder = srOrders[0];
      const awb = srOrder.shipments?.[0]?.awb || null;
      const courierName = srOrder.shipments?.[0]?.courier || null;
      const srStatus = srOrder.status || '';

      // Map Shiprocket status to our DB status
      let dbStatus = 'SHIPPED';
      if (srStatus.toLowerCase().includes('delivered')) dbStatus = 'DELIVERED';
      else if (srStatus.toLowerCase().includes('out for delivery')) dbStatus = 'OUT FOR DELIVERY';
      else if (srStatus.toLowerCase().includes('cancel') || srStatus.toLowerCase().includes('rto')) dbStatus = 'CANCELLED';
      else if (srStatus.toLowerCase().includes('pickup') || srStatus.toLowerCase().includes('transit') || srStatus.toLowerCase().includes('shipped')) dbStatus = 'SHIPPED';

      // Upsert into our shipments table
      const { data: existingShipment } = await supabase
        .from('shipments')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingShipment) {
        await supabase.from('shipments').update({
          tracking_number: awb,
          courier_name: courierName,
          status: dbStatus,
        }).eq('id', existingShipment.id);
      } else {
        await supabase.from('shipments').insert({
          order_id: orderId,
          tracking_number: awb,
          courier_name: courierName,
          status: dbStatus,
        });
      }

      // Also update order status
      await supabase.from('orders').update({ status: dbStatus }).eq('id', orderId);

      return new Response(JSON.stringify({
        success: true,
        synced: { awb, courierName, dbStatus }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── ACTION: create order (default / existing behaviour) ─────────────────
    let orderId = payload.record?.id;
    if (payload.table === 'payments' && payload.record?.order_id) {
       orderId = payload.record?.order_id;
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "No order ID found in payload" }), { status: 400, headers: corsHeaders });
    }

    // Wait 2 seconds to ensure child records are fully committed
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
      order_id: order.id,
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
      billing_email: billingEmail,
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

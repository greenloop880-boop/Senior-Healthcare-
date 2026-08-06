import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Always return 200 for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Shiprocket often sends test pings. We must return 200 OK so the webhook saves successfully.
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      // If it's not JSON (like an empty ping), just return success
      return new Response(JSON.stringify({ success: true, message: "Ping received" }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // A valid Shiprocket payload usually has 'current_status' and 'channel_order_id'
    const status = payload.current_status;
    const orderId = payload.channel_order_id;
    const awb = payload.awb;
    const courier = payload.courier_name;

    if (!orderId || !status) {
      // Return 200 even if fields are missing to avoid Shiprocket disabling the webhook
      return new Response(JSON.stringify({ success: true, message: "Incomplete payload ignored" }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update the parent Order status
    let newOrderStatus = 'PROCESSING';
    if (status === 'SHIPPED' || status === 'IN TRANSIT' || status === 'OUT FOR DELIVERY') {
      newOrderStatus = 'SHIPPED';
    } else if (status === 'DELIVERED') {
      newOrderStatus = 'DELIVERED';
    } else if (status === 'CANCELED' || status === 'RTO INITIATED') {
      newOrderStatus = 'CANCELLED';
    }

    await supabase
      .from('orders')
      .update({ status: newOrderStatus })
      .eq('id', orderId);

    // Check if shipment record exists
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingShipment) {
      // Update existing
      await supabase
        .from('shipments')
        .update({
          tracking_number: awb || null,
          courier_name: courier || null,
          status: status,
          shipped_at: (status === 'SHIPPED') ? new Date().toISOString() : undefined,
          delivered_at: (status === 'DELIVERED') ? new Date().toISOString() : undefined
        })
        .eq('id', existingShipment.id);
    } else {
      // Insert new shipment
      await supabase
        .from('shipments')
        .insert([{
          order_id: orderId,
          tracking_number: awb || null,
          courier_name: courier || null,
          status: status,
          shipped_at: (status === 'SHIPPED') ? new Date().toISOString() : null,
          delivered_at: (status === 'DELIVERED') ? new Date().toISOString() : null
        }]);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Return 200 even on error to prevent Shiprocket from disabling the webhook
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const payload = await req.json();
    console.log("Received Shiprocket Webhook:", payload);

    // Initialize Supabase Client (Service Role for admin privileges)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // The channel_order_id is our Supabase order.id UUID
    const orderId = payload.channel_order_id;
    
    // Log the webhook in the database
    await supabase.from('webhook_logs').insert([{
      source: 'shiprocket',
      event_type: payload.current_status || 'UNKNOWN',
      payload: payload
    }]);

    if (!orderId) {
      return new Response(JSON.stringify({ success: true, message: "Ignored (no channel_order_id)" }), { status: 200 });
    }

    // Map Shiprocket status to our database status
    const srStatus = payload.current_status || payload.shipment_status || '';
    let dbStatus = '';
    
    if (srStatus.includes('SHIPPED') || srStatus.includes('IN TRANSIT') || srStatus.includes('PICKED UP')) {
      dbStatus = 'SHIPPED';
    } else if (srStatus.includes('OUT FOR DELIVERY')) {
      dbStatus = 'OUT FOR DELIVERY';
    } else if (srStatus.includes('DELIVERED')) {
      dbStatus = 'DELIVERED';
    } else if (srStatus.includes('CANCELLED') || srStatus.includes('RTO')) {
      dbStatus = 'CANCELLED';
    }

    if (dbStatus) {
      // 1. Update the shipments table with the AWB and Courier if available
      const awb = payload.awb || payload.tracking_id;
      const courier = payload.courier_name || payload.courier;
      
      if (awb || courier) {
        // Find existing shipment
        const { data: existingShipment } = await supabase
          .from('shipments')
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle();

        if (existingShipment) {
          await supabase.from('shipments').update({
            tracking_number: awb || null,
            courier_name: courier || null,
            status: dbStatus
          }).eq('id', existingShipment.id);
        } else {
          await supabase.from('shipments').insert([{
            order_id: orderId,
            tracking_number: awb || null,
            courier_name: courier || null,
            status: dbStatus
          }]);
        }
      }

      // 2. Update the main orders table status
      await supabase.from('orders').update({ status: dbStatus }).eq('id', orderId);
    }

    return new Response(JSON.stringify({ success: true, mapped_status: dbStatus }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Always return 200 to Shiprocket so it doesn't retry indefinitely
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

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
    const { action, ...payload } = await req.json();

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    console.log("Has Service Role Key:", !!supabaseKey);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? 'rzp_test_T2oecJOvrTA6PI';
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? 'egwVysvkZy28E3L1hVv6RF8L';

    if (action === 'create_order') {
      const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}`, notes = {} } = payload;
      
      const rzpAmount = Math.round(amount * 100);
      if (rzpAmount < 100) throw new Error("Amount must be at least 1 INR");

      // Call Razorpay API
      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`
        },
        body: JSON.stringify({
          amount: rzpAmount,
          currency,
          receipt,
          notes
        })
      });

      const order = await rzpRes.json();
      if (order.error) throw new Error(order.error.description);

      return new Response(JSON.stringify(order), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify_payment') {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        cartItems,
        customerDetails,
        totalAmount,
        userId
      } = payload;

      // 1. Verify Signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(RAZORPAY_KEY_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );

      const dataToSign = encoder.encode(razorpay_order_id + "|" + razorpay_payment_id);
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, dataToSign);
      
      // Convert ArrayBuffer to Hex string
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const generatedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (generatedSignature !== razorpay_signature) {
        return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), { status: 200, headers: corsHeaders });
      }

      // 2. Insert into Supabase Orders table
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ customer_id: userId, status: 'PROCESSING', total_amount: totalAmount }])
        .select()
        .single();
      
      if (orderError) throw new Error(`[URL: ${supabaseUrl} | Key: ${supabaseKey.substring(0, 10)}...] ${orderError.message}`);

      // 3. Insert Address
      await supabase.from('order_addresses').insert([{
        order_id: order.id,
        address_type: 'SHIPPING',
        full_name: customerDetails.name,
        phone: customerDetails.phone,
        address_line1: customerDetails.address,
        pincode: customerDetails.pincode,
        city: customerDetails.city || 'Default City',
        state: customerDetails.state || 'Default State'
      }]);

      // 4. Insert Order Items & Payments
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        sku_id: item.selectedSku ? item.selectedSku.id : (item.product.skus && item.product.skus.length > 0 ? item.product.skus[0].id : null),
        quantity: item.quantity,
        unit_price: item.selectedSku ? item.selectedSku.selling_price : item.product.price,
        unit_cost: 0 // Fetch actual average_cost if needed
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      const { error: paymentError } = await supabase.from('payments').insert([{
        order_id: order.id,
        gateway: 'razorpay',
        gateway_order_id: razorpay_order_id,
        gateway_payment_id: razorpay_payment_id,
        amount: totalAmount,
        status: 'CAPTURED'
      }]);
      if (paymentError) throw paymentError;

      return new Response(JSON.stringify({ success: true, orderId: order.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'cancel_order') {
      const { order_id } = payload;
      
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, payments(*), shipments(*)')
        .eq('id', order_id)
        .single();
        
      if (orderError || !order) throw new Error("Order not found");
      
      // Check if shipped
      const shipment = order.shipments?.[0];
      if (shipment && ['SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED'].includes(shipment.status)) {
        throw new Error("Order has already been shipped and cannot be cancelled.");
      }
      
      // Process refund if Razorpay payment exists and is captured
      const payment = order.payments?.find((p: any) => p.gateway === 'razorpay' && p.status === 'CAPTURED');
      
      if (payment) {
        const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
        const refundRes = await fetch(`https://api.razorpay.com/v1/payments/${payment.gateway_payment_id}/refund`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${auth}`
          },
          body: JSON.stringify({
            amount: Math.round(payment.amount * 100), // full refund
            notes: { reason: "Customer cancelled before shipment" }
          })
        });
        
        const refundData = await refundRes.json();
        if (refundData.error) {
          console.error("Refund failed:", refundData.error);
          throw new Error("Refund failed: " + refundData.error.description);
        }
        
        // Update payment status to REFUNDED
        await supabase.from('payments').update({ status: 'REFUNDED' }).eq('id', payment.id);
      }
      
      // Update order status
      await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', order_id);
      
      // Also update shipment status to CANCELLED if it exists
      if (shipment) {
        await supabase.from('shipments').update({ status: 'CANCELLED' }).eq('id', shipment.id);
      }
      
      return new Response(JSON.stringify({ success: true, message: "Order cancelled and refunded successfully" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error("Invalid action");

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

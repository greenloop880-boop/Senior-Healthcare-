import { supabase } from '../supabase/client';

export const orderService = {
  async getOrdersPaginated({ search = '', status = 'All Status', dateFilter = 'All Dates', page = 1, pageSize = 10 }) {
    const { data, error } = await supabase.rpc('admin_get_orders', {
      p_search: search,
      p_status: status,
      p_date_filter: dateFilter,
      p_page_number: page,
      p_page_size: pageSize
    });
    if (error) throw error;
    return data || [];
  },

  async getOrderDetails(orderId) {
    const { data, error } = await supabase.rpc('admin_get_order_details', {
      p_order_id: orderId
    });
    if (error) throw error;
    return data;
  },

  async updatePaymentStatus(orderId, newStatus) {
    const { data, error } = await supabase
      .from('payments')
      .update({ status: newStatus })
      .eq('order_id', orderId)
      .select();
    if (error) throw error;
    return data;
  },

  async updateAdminNotes(orderId, notes) {
    const { data, error } = await supabase
      .from('orders')
      .update({ admin_notes: notes })
      .eq('id', orderId)
      .select();
    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId, newStatus) {
    if (newStatus === 'CANCELLED') {
      try {
        const { data, error } = await supabase.functions.invoke('razorpay', {
          body: { action: 'cancel_order', order_id: orderId }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        
        // Restore inventory logic
        await this._restoreInventoryForCancelledOrder(orderId);
        
        return data;
      } catch (err) {
        console.warn("Edge function cancel failed, falling back to direct DB update.", err);
        const { data, error } = await supabase
          .from('orders')
          .update({ status: 'CANCELLED' })
          .eq('id', orderId)
          .select()
          .single();
        if (error) throw error;
        
        // Restore inventory logic
        await this._restoreInventoryForCancelledOrder(orderId);
        
        return data;
      }
    } else if (newStatus === 'SHIPPED') {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      
      // Push to Shiprocket
      try {
        const { data: srData, error: srError } = await supabase.functions.invoke('shiprocket', {
          body: { record: { id: orderId }, table: 'orders' }
        });
        
        if (srError) throw srError;
        if (srData?.error) throw new Error(srData.error);
        
        // Check if Shiprocket actually created an order (it should return an order_id or shipment_id)
        if (!srData?.shiprocketResponse?.order_id && !srData?.shiprocketResponse?.shipment_id) {
           const errMsg = srData?.shiprocketResponse?.message || JSON.stringify(srData?.shiprocketResponse);
           throw new Error("Shiprocket API Error: " + errMsg);
        }
        
      } catch (err) {
        console.warn("Shiprocket push failed:", err);
        throw new Error("Order marked as SHIPPED locally, but Shiprocket rejected it: " + err.message, { cause: err });
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async addShipment(orderId, trackingNumber, courier) {
    // Check if shipment exists
    const { data: existing } = await supabase.from('shipments').select('id').eq('order_id', orderId).maybeSingle();
    
    if (existing) {
      await supabase.from('shipments').update({
        tracking_number: trackingNumber,
        status: 'SHIPPED',
        courier_name: courier
      }).eq('id', existing.id);
    } else {
      await supabase.from('shipments').insert({
        order_id: orderId,
        status: 'SHIPPED',
        tracking_number: trackingNumber,
        courier_name: courier
      });
    }
    
    // Also update order status
    await this.updateOrderStatus(orderId, 'SHIPPED');
  },

  async getInventoryInsights() {
    const { data, error } = await supabase
      .from('skus')
      .select(`
        id,
        sku_code,
        variant_name,
        selling_price,
        reorder_level,
        products (name),
        inventory (quantity_available, quantity_reserved),
        inventory_transactions (transaction_type, quantity_change)
      `);
    if (error) throw error;
    return data;
  },

  async _restoreInventoryForCancelledOrder(orderId) {
    try {
      // 1. Fetch order details to get fulfillment warehouse
      const { data: order } = await supabase.from('orders').select('fulfillment_warehouse_id').eq('id', orderId).single();
      
      // 2. Fetch order items
      const { data: items } = await supabase.from('order_items').select('sku_id, quantity, unit_cost').eq('order_id', orderId);
      
      if (order && items && items.length > 0) {
        let warehouseId = order.fulfillment_warehouse_id;
        
        if (!warehouseId) {
          const { data: defaultWh } = await supabase.from('warehouses').select('id').limit(1).single();
          if (defaultWh) warehouseId = defaultWh.id;
        }

        if (warehouseId) {
          const transactions = items.map(item => ({
            sku_id: item.sku_id,
            warehouse_id: warehouseId,
            transaction_type: 'RESTOCK_CANCEL',
            quantity_change: item.quantity,
            unit_cost: item.unit_cost,
            reference_type: 'ORDER',
            reference_id: orderId
          }));
          await supabase.from('inventory_transactions').insert(transactions);
        }
      }
    } catch (e) {
      console.error("Failed to restore inventory for cancelled order:", e);
    }
  }
};

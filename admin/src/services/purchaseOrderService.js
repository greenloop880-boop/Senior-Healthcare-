import { supabase } from '../supabase/client';

export const purchaseOrderService = {
  async getPurchaseOrders() {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors ( name ),
        purchase_order_items ( id, sku_id, quantity_ordered, quantity_received, unit_cost, total_cost, skus ( sku_code, products ( name ) ) )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createPO(payload) {
    const { vendor_id, expected_delivery_date, items } = payload;
    
    // 1. Create the PO
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert([{
        vendor_id,
        expected_delivery_date,
        status: 'DRAFT',
        total_amount: items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0)
      }])
      .select()
      .single();
    
    if (poError) throw poError;

    // 2. Insert the PO Items
    const poItems = items.map(item => ({
      purchase_order_id: po.id,
      sku_id: item.sku_id,
      quantity_ordered: item.quantity_ordered,
      unit_cost: item.unit_cost
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(poItems);
    
    if (itemsError) throw itemsError;
    return po;
  },

  async updatePOStatus(poId, newStatus) {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: newStatus })
      .eq('id', poId);
    
    if (error) throw error;
    return true;
  },

  async receiveGoods(poId, warehouseId, receivedItems) {
    // receivedItems: [{ poi_id, sku_id, quantity_to_receive, unit_cost }]
    
    for (const item of receivedItems) {
      if (item.quantity_to_receive <= 0) continue;

      // 1. Log the Purchase Transaction (this will trigger stock updates and moving avg cost!)
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
          sku_id: item.sku_id,
          warehouse_id: warehouseId,
          transaction_type: 'PURCHASE',
          quantity_change: item.quantity_to_receive,
          unit_cost: item.unit_cost,
          reference_type: 'PURCHASE',
          reference_id: poId
        }]);
      
      if (txError) throw txError;

      // 2. Update the PO Item's received quantity
      const { data: poi } = await supabase.from('purchase_order_items').select('quantity_received').eq('id', item.poi_id).single();
      
      const { error: poiError } = await supabase
        .from('purchase_order_items')
        .update({ quantity_received: (poi?.quantity_received || 0) + item.quantity_to_receive })
        .eq('id', item.poi_id);
      
      if (poiError) throw poiError;
    }

    // 3. Determine if PO is fully received or partially received
    const { data: allItems } = await supabase.from('purchase_order_items').select('quantity_ordered, quantity_received').eq('purchase_order_id', poId);
    
    const isFullyReceived = allItems.every(i => i.quantity_received >= i.quantity_ordered);
    const newStatus = isFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    await this.updatePOStatus(poId, newStatus);
    return true;
  },
  
  async getProductsWithSkus() {
    // For selecting SKUs when creating a PO
    const { data, error } = await supabase
      .from('products')
      .select('id, name, skus(id, sku_code, average_cost)')
      .eq('is_active', true);
      
    if (error) throw error;
    return data;
  }
};

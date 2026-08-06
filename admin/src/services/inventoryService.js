import { supabase } from '../supabase/client';

export const inventoryService = {
  async getInventoryList() {
    const { data, error } = await supabase
      .from('skus')
      .select(`
        *,
        products!inner ( name, image_url, status, is_active, deleted_at ),
        inventory ( id, warehouse_id, quantity_available, quantity_reserved, safety_stock, maximum_stock, incoming_stock, damaged_stock )
      `)
      .is('deleted_at', null)
      .is('products.deleted_at', null)
      .order('sku_code', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async getSkuTransactions(skuId) {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select(`
        *,
        warehouses ( name )
      `)
      .eq('sku_id', skuId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getWarehouses() {
    const { data, error } = await supabase.from('warehouses').select('*').eq('is_active', true);
    if (error) throw error;
    return data;
  },

  async manualAdjustment(payload) {
    const { sku_id, warehouse_id, inventory_id, current_available, quantity_change, reason_code, notes, unit_cost } = payload;
    
    if (quantity_change === 0) throw new Error("Quantity change cannot be zero");

    // 1. Insert Transaction Ledger Entry
    const { error: tError } = await supabase
      .from('inventory_transactions')
      .insert([{
        sku_id,
        warehouse_id,
        transaction_type: 'MANUAL_ADJUSTMENT',
        quantity_change,
        unit_cost: unit_cost || 0,
        reference_type: 'MANUAL_ADJUSTMENT',
        reference_id: reason_code
      }]);
    
    if (tError) throw tError;

    // 2. Update actual Inventory
    if (inventory_id) {
      const { error: iError } = await supabase
        .from('inventory')
        .update({ quantity_available: current_available + quantity_change })
        .eq('id', inventory_id);
      
      if (iError) throw iError;
    } else {
      // If no inventory record existed for this warehouse, create it
      const { error: iError } = await supabase
        .from('inventory')
        .insert([{
          sku_id,
          warehouse_id,
          quantity_available: quantity_change,
          quantity_reserved: 0
        }]);
      
      if (iError) throw iError;
    }

    return true;
  }
};

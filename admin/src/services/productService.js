import { supabase } from '../supabase/client';

export const productService = {
  async getProducts() {
    // Fetch products along with their SKUs, Inventory, and Category
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories ( id, name ),
        product_concerns ( concern_id ),
        skus (
          id, sku_code, variant_name, selling_price, mrp, average_cost, reorder_level,
          inventory ( quantity_available, quantity_reserved )
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getConcerns() {
    const { data, error } = await supabase.from('concerns').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async getDefaultWarehouse() {
    const { data, error } = await supabase.from('warehouses').select('id').limit(1).single();
    if (error) throw error;
    return data.id;
  },

  async getDefaultVendor() {
    const { data, error } = await supabase.from('vendors').select('id').limit(1).single();
    if (error) throw error;
    return data.id;
  },

  async createProduct(productData) {
    const { skus, selectedConcerns, openingStock, ...coreProduct } = productData;
    
    // 1. Get default vendor if not provided
    if (!coreProduct.vendor_id) {
      coreProduct.vendor_id = await this.getDefaultVendor();
    }

    // 2. Insert Core Product
    const { data: product, error: pError } = await supabase
      .from('products')
      .insert([coreProduct])
      .select()
      .single();
    
    if (pError) throw pError;

    // 3. Map Concerns (Many-to-Many)
    if (selectedConcerns && selectedConcerns.length > 0) {
      const concernRows = selectedConcerns.map(cId => ({
        product_id: product.id,
        concern_id: cId
      }));
      await supabase.from('product_concerns').insert(concernRows);
    }

    // 4. Insert SKUs and Opening Stock
    const warehouseId = await this.getDefaultWarehouse();

    for (const sku of skus) {
      const { data: newSku, error: sError } = await supabase
        .from('skus')
        .insert([{
          product_id: product.id,
          sku_code: sku.sku_code,
          variant_name: sku.variant_name,
          selling_price: Number(sku.selling_price),
          mrp: Number(sku.mrp),
          reorder_level: Number(sku.reorder_level),
          average_cost: Number(sku.purchase_cost)
        }])
        .select()
        .single();
      
      if (sError) throw sError;

      // 5. Create Inventory Transaction for Stock Adjustment
      if (sku.stock_adjustment && sku.stock_adjustment !== 0) {
        const { error: tError } = await supabase
          .from('inventory_transactions')
          .insert([{
            sku_id: newSku.id,
            warehouse_id: warehouseId,
            transaction_type: 'MANUAL_ADJUSTMENT',
            quantity_change: Number(sku.stock_adjustment),
            unit_cost: Number(sku.purchase_cost) || 0,
            reference_type: 'MANUAL_ADJUSTMENT',
            reference_id: 'WIZARD_ADJUSTMENT'
          }]);
        if (tError) throw tError;
      }
    }

    return product;
  },

  async updateProduct(id, productData) {
    const { skus, selectedConcerns, openingStock, ...coreProduct } = productData;
    
    // 1. Update Core Product
    const { data: product, error: pError } = await supabase
      .from('products')
      .update(coreProduct)
      .eq('id', id)
      .select()
      .single();
    
    if (pError) throw pError;

    // 2. Map Concerns (Many-to-Many)
    await supabase.from('product_concerns').delete().eq('product_id', id);
    if (selectedConcerns && selectedConcerns.length > 0) {
      const concernRows = selectedConcerns.map(cId => ({
        product_id: id,
        concern_id: cId
      }));
      await supabase.from('product_concerns').insert(concernRows);
    }

    // 3. Upsert SKUs and handle Stock Adjustments
    const warehouseId = await this.getDefaultWarehouse();
    
    for (const sku of skus) {
      let currentSkuId = sku.id;
      
      if (currentSkuId) {
        // Update existing SKU
        const { error: sError } = await supabase
          .from('skus')
          .update({
            sku_code: sku.sku_code,
            variant_name: sku.variant_name,
            selling_price: Number(sku.selling_price),
            mrp: Number(sku.mrp),
            reorder_level: Number(sku.reorder_level),
            average_cost: Number(sku.purchase_cost)
          })
          .eq('id', currentSkuId);
        if (sError) throw sError;
      } else {
        // Insert new SKU
        const { data: newSku, error: sError } = await supabase
          .from('skus')
          .insert([{
            product_id: id,
            sku_code: sku.sku_code,
            variant_name: sku.variant_name,
            selling_price: Number(sku.selling_price),
            mrp: Number(sku.mrp),
            reorder_level: Number(sku.reorder_level),
            average_cost: Number(sku.purchase_cost)
          }])
          .select('id').single();
        if (sError) throw sError;
        currentSkuId = newSku.id;
      }
      
      // Handle Inventory Adjustment
      if (sku.stock_adjustment && sku.stock_adjustment !== 0) {
        const { error: tError } = await supabase
          .from('inventory_transactions')
          .insert([{
            sku_id: currentSkuId,
            warehouse_id: warehouseId,
            transaction_type: 'MANUAL_ADJUSTMENT',
            quantity_change: Number(sku.stock_adjustment),
            unit_cost: Number(sku.purchase_cost) || 0,
            reference_type: 'MANUAL_ADJUSTMENT',
            reference_id: 'WIZARD_ADJUSTMENT'
          }]);
        if (tError) throw tError;
      }
    }

    return product;
  },

  async deleteProduct(id) {
    const timestamp = new Date().toISOString();
    const deletedSuffix = `-del-${Date.now()}`;
    
    // 1. Fetch the product first to safely rename unique constraints
    const { data: existing, error: fetchErr } = await supabase
      .from('products')
      .select('slug, internal_code, url_slug')
      .eq('id', id)
      .single();
      
    if (fetchErr) throw fetchErr;

    const updatePayload = { 
      is_active: false, 
      deleted_at: timestamp,
      status: 'ARCHIVED'
    };

    // Rename unique keys to free them up for new products
    if (existing.slug) updatePayload.slug = `${existing.slug.substring(0, 200)}${deletedSuffix}`;
    if (existing.internal_code) updatePayload.internal_code = `${existing.internal_code.substring(0, 50)}${deletedSuffix}`;
    if (existing.url_slug) updatePayload.url_slug = `${existing.url_slug.substring(0, 200)}${deletedSuffix}`;

    // Soft delete: set is_active to false and record deleted_at timestamp
    const { error: pError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id);
    
    if (pError) throw pError;

    // Cascade soft delete to SKUs
    const { error: sError } = await supabase
      .from('skus')
      .update({
        status: 'ARCHIVED',
        deleted_at: timestamp
      })
      .eq('product_id', id);
      
    if (sError) throw sError;
  }
};

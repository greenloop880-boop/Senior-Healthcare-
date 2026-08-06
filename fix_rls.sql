-- Enable RLS for all new tables and grant full access to authenticated admins

-- 1. Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create Admin Bypass Policies
-- This allows anyone who is authenticated (in your app's case, the admin) to do everything.
-- If you have a specific admin role, you can change 'authenticated' to that role logic.

CREATE POLICY "Enable all access for authenticated users on brands" ON brands FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on attributes" ON attributes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on attribute_values" ON attribute_values FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on sku_attribute_values" ON sku_attribute_values FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on sku_images" ON sku_images FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on inventory_adjustments" ON inventory_adjustments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on inventory_batches" ON inventory_batches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on inventory_serials" ON inventory_serials FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on system_settings" ON system_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on number_sequences" ON number_sequences FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on returns" ON returns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on return_items" ON return_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on refunds" ON refunds FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users on audit_logs" ON audit_logs FOR ALL USING (auth.role() = 'authenticated');

-- 3. Also ensure vendors and purchase_orders have RLS if they don't already
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    BEGIN
        CREATE POLICY "Enable all access for authenticated users on vendors" ON vendors FOR ALL USING (auth.role() = 'authenticated');
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        CREATE POLICY "Enable all access for authenticated users on purchase_orders" ON purchase_orders FOR ALL USING (auth.role() = 'authenticated');
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        CREATE POLICY "Enable all access for authenticated users on purchase_order_items" ON purchase_order_items FOR ALL USING (auth.role() = 'authenticated');
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

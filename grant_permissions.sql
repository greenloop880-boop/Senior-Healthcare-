-- 1. Grant usage on schema (usually granted by default, but just to be safe)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant all privileges on all newly created tables to the API roles
GRANT ALL PRIVILEGES ON TABLE brands TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE categories TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE attributes TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE attribute_values TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE sku_attribute_values TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE sku_images TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE inventory_adjustments TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE inventory_batches TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE inventory_serials TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE system_settings TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE number_sequences TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE returns TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE return_items TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE refunds TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE audit_logs TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE vendors TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE purchase_orders TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE purchase_order_items TO anon, authenticated;

-- 3. If there are sequences involved (usually Supabase uses UUIDs so this isn't strictly necessary, but good practice)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

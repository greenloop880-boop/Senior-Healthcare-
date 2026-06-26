-- d:\ecom\supabase_admin_setup.sql

-- =====================================================================================
-- 1. USER ROLES & ADMIN HELPER
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin'))
);

-- Note: Replace 'YOUR_AUTH_USER_ID' with your actual Supabase Auth User ID
-- INSERT INTO user_roles (user_id, role) VALUES ('YOUR_AUTH_USER_ID', 'admin');

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- =====================================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on all operational and catalog tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation (Drop first)
DROP POLICY IF EXISTS "Admin All Access on orders" ON orders;
DROP POLICY IF EXISTS "Admin All Access on order_items" ON order_items;
DROP POLICY IF EXISTS "Admin All Access on payments" ON payments;
DROP POLICY IF EXISTS "Admin All Access on inventory" ON inventory;
DROP POLICY IF EXISTS "Admin All Access on inventory_transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Admin All Access on purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Admin All Access on purchase_order_items" ON purchase_order_items;
DROP POLICY IF EXISTS "Admin All Access on shipments" ON shipments;
DROP POLICY IF EXISTS "Admin All Access on inventory_allocations" ON inventory_allocations;
DROP POLICY IF EXISTS "Admin All Access on products" ON products;
DROP POLICY IF EXISTS "Admin All Access on skus" ON skus;
DROP POLICY IF EXISTS "Admin All Access on vendors" ON vendors;
DROP POLICY IF EXISTS "Admin All Access on warehouses" ON warehouses;
DROP POLICY IF EXISTS "Admin All Access on audit_logs" ON audit_logs;

-- Apply Admin-Only Policies
CREATE POLICY "Admin All Access on orders" ON orders FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on order_items" ON order_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on payments" ON payments FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on inventory" ON inventory FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on inventory_transactions" ON inventory_transactions FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on purchase_orders" ON purchase_orders FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on purchase_order_items" ON purchase_order_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on shipments" ON shipments FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on inventory_allocations" ON inventory_allocations FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on products" ON products FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on skus" ON skus FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on vendors" ON vendors FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on warehouses" ON warehouses FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin All Access on audit_logs" ON audit_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- =====================================================================================
-- 3. DASHBOARD METRICS RPC (Direct secure query)
-- =====================================================================================

-- Drop the old view if it was created
DROP VIEW IF EXISTS dashboard_metrics CASCADE;

CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS TABLE (
    total_orders BIGINT,
    pending_orders BIGINT,
    total_revenue NUMERIC,
    total_profit NUMERIC,
    inventory_value NUMERIC,
    low_stock_count BIGINT,
    total_products BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    calc_total_orders BIGINT;
    calc_pending_orders BIGINT;
    calc_total_revenue NUMERIC;
    calc_total_cogs NUMERIC;
    calc_inventory_value NUMERIC;
    calc_low_stock_count BIGINT;
    calc_total_products BIGINT;
BEGIN
    -- Verify admin access before returning data
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Admin privileges required.';
    END IF;

    -- Orders
    SELECT COUNT(*) INTO calc_total_orders FROM orders WHERE status NOT IN ('CANCELLED', 'DRAFT');
    SELECT COUNT(*) INTO calc_pending_orders FROM orders WHERE status = 'PENDING';
    
    -- Revenue and Historical COGS
    SELECT COALESCE(SUM(o.total_amount), 0) INTO calc_total_revenue 
    FROM orders o WHERE o.status NOT IN ('CANCELLED', 'DRAFT');

    SELECT COALESCE(SUM(oi.total_cost), 0) INTO calc_total_cogs 
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    WHERE o.status NOT IN ('CANCELLED', 'DRAFT');

    -- Inventory Value & Low Stock (Dynamic based on sku reorder_level)
    SELECT COALESCE(SUM(i.quantity_available * s.average_cost), 0)
    INTO calc_inventory_value
    FROM inventory i 
    JOIN skus s ON i.sku_id = s.id;

    SELECT COUNT(*) INTO calc_low_stock_count 
    FROM inventory i 
    JOIN skus s ON i.sku_id = s.id
    WHERE i.quantity_available < s.reorder_level;

    -- Products
    SELECT COUNT(*) INTO calc_total_products FROM products;

    RETURN QUERY SELECT 
        calc_total_orders,
        calc_pending_orders,
        calc_total_revenue,
        (calc_total_revenue - calc_total_cogs) AS total_profit,
        calc_inventory_value,
        calc_low_stock_count,
        calc_total_products;
END;
$$;

-- d:\ecom\supabase_schema.sql

-- =====================================================================================
-- CLEANUP: If you are getting "relation already exists" errors, uncomment the line below 
-- to drop the old tables before running this script. WARNING: THIS WILL DELETE EXISTING DATA.
-- DROP TABLE IF EXISTS vendors, warehouses, products, skus, inventory, inventory_transactions, orders, order_addresses, inventory_allocations, order_status_history, payments, shipments, webhook_logs, order_items, purchase_orders, purchase_order_items, audit_logs CASCADE;
-- DROP VIEW IF EXISTS inventory_summary, sales_summary, product_performance CASCADE;
-- =====================================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Vendors Table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Warehouses Table
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location_address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(1000),
    images JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SKUs Table
CREATE TABLE skus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    average_cost NUMERIC(12, 2) DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL,
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Inventory Table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity_available INTEGER DEFAULT 0 CHECK (quantity_available >= 0),
    quantity_reserved INTEGER DEFAULT 0 CHECK (quantity_reserved >= 0),
    UNIQUE(sku_id, warehouse_id)
);

-- 6. Inventory Transactions Table
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'RESERVE', 'SALE', 'RESTOCK_CANCEL', 'MANUAL_ADJUSTMENT')),
    quantity_change INTEGER NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    reference_type VARCHAR(50) CHECK (reference_type IN ('ORDER', 'PURCHASE', 'MANUAL_ADJUSTMENT')),
    reference_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID,
    fulfillment_warehouse_id UUID REFERENCES warehouses(id),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Order Addresses Table
CREATE TABLE order_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    address_type VARCHAR(50) CHECK (address_type IN ('BILLING', 'SHIPPING')),
    full_name VARCHAR(255),
    phone VARCHAR(50),
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    UNIQUE(order_id, address_type)
);

-- 9. Inventory Allocations Table
CREATE TABLE inventory_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Order Status History Table
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    gateway VARCHAR(50) DEFAULT 'razorpay',
    gateway_order_id VARCHAR(255) UNIQUE,
    gateway_payment_id VARCHAR(255) UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Shipments Table
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    courier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    shiprocket_order_id VARCHAR(100),
    shiprocket_shipment_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'CREATED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_shiprocket_order_id ON shipments(shiprocket_order_id);
CREATE INDEX idx_tracking_number ON shipments(tracking_number);

-- 13. Webhook Logs Table
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) CHECK (source IN ('razorpay', 'shiprocket', 'other')),
    event_type VARCHAR(100),
    provider_event_id VARCHAR(255) UNIQUE,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES skus(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL, -- Captured at sale time for accurate profit
    total_price NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- 15. Purchase Orders Table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    expected_delivery_date DATE,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Purchase Order Items Table
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES skus(id),
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER DEFAULT 0 CHECK (quantity_received >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED
);

-- 17. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- =====================================================================================

-- Trigger: Log Order Status Changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO order_status_history (order_id, old_status, new_status, changed_by)
        VALUES (NEW.id, NULL, NEW.status, 'system');
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO order_status_history (order_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_order_status_change
AFTER INSERT OR UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION log_order_status_change();


-- Trigger: Calculate Moving Average Cost on PURCHASE transactions
CREATE OR REPLACE FUNCTION update_moving_average_cost()
RETURNS TRIGGER AS $$
DECLARE
    current_total_qty INTEGER;
    current_avg_cost NUMERIC(12, 2);
    new_avg_cost NUMERIC(12, 2);
BEGIN
    IF NEW.transaction_type = 'PURCHASE' AND NEW.quantity_change > 0 THEN
        -- Only consider owned stock (available + reserved) for accounting cost
        SELECT COALESCE(SUM(quantity_available + quantity_reserved), 0)
        INTO current_total_qty
        FROM inventory
        WHERE sku_id = NEW.sku_id;

        SELECT average_cost INTO current_avg_cost
        FROM skus
        WHERE id = NEW.sku_id;

        IF current_avg_cost IS NULL THEN current_avg_cost := 0; END IF;

        new_avg_cost := ((current_total_qty * current_avg_cost) + (NEW.quantity_change * NEW.unit_cost)) / (current_total_qty + NEW.quantity_change);

        UPDATE skus SET average_cost = new_avg_cost WHERE id = NEW.sku_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_moving_average_cost
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_moving_average_cost();


-- Function to update inventory correctly when transactions occur
CREATE OR REPLACE FUNCTION process_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (sku_id, warehouse_id, quantity_available, quantity_reserved)
    VALUES (NEW.sku_id, NEW.warehouse_id, 0, 0)
    ON CONFLICT (sku_id, warehouse_id) DO NOTHING;

    IF NEW.transaction_type = 'PURCHASE' THEN
        UPDATE inventory 
        SET quantity_available = quantity_available + NEW.quantity_change
        WHERE sku_id = NEW.sku_id AND warehouse_id = NEW.warehouse_id;

    ELSIF NEW.transaction_type = 'RESERVE' THEN
        UPDATE inventory 
        SET quantity_available = quantity_available - NEW.quantity_change,
            quantity_reserved = quantity_reserved + NEW.quantity_change
        WHERE sku_id = NEW.sku_id AND warehouse_id = NEW.warehouse_id;

    ELSIF NEW.transaction_type = 'SALE' THEN
        -- Sale finalizes the reservation
        UPDATE inventory 
        SET quantity_reserved = quantity_reserved - NEW.quantity_change
        WHERE sku_id = NEW.sku_id AND warehouse_id = NEW.warehouse_id;
        
    ELSIF NEW.transaction_type = 'RESTOCK_CANCEL' THEN
        -- Move from reserved back to available
        UPDATE inventory 
        SET quantity_available = quantity_available + NEW.quantity_change,
            quantity_reserved = quantity_reserved - NEW.quantity_change
        WHERE sku_id = NEW.sku_id AND warehouse_id = NEW.warehouse_id;
        
    ELSIF NEW.transaction_type = 'MANUAL_ADJUSTMENT' THEN
        UPDATE inventory 
        SET quantity_available = quantity_available + NEW.quantity_change
        WHERE sku_id = NEW.sku_id AND warehouse_id = NEW.warehouse_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_inventory_transaction
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION process_inventory_transaction();


-- =====================================================================================
-- ADMIN DASHBOARD VIEWS
-- =====================================================================================

-- View: inventory_summary
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
    i.sku_id,
    s.sku_code,
    SUM(i.quantity_available) AS available_stock,
    SUM(i.quantity_reserved) AS reserved_stock,
    SUM((i.quantity_available + i.quantity_reserved) * s.average_cost) AS inventory_value
FROM inventory i
JOIN skus s ON i.sku_id = s.id
GROUP BY i.sku_id, s.sku_code;

-- View: sales_summary
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
    DATE(o.created_at) AS date,
    COUNT(DISTINCT o.id) AS orders,
    SUM(o.total_amount) AS revenue,
    COALESCE(SUM(oi.total_price) - SUM(oi.total_cost), 0) AS profit
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.status NOT IN ('CANCELLED', 'DRAFT')
GROUP BY DATE(o.created_at);

-- View: product_performance
CREATE OR REPLACE VIEW product_performance AS
SELECT 
    oi.sku_id,
    s.sku_code,
    p.name AS product_name,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.total_price) AS revenue,
    COALESCE(SUM(oi.total_price) - SUM(oi.total_cost), 0) AS profit
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN skus s ON oi.sku_id = s.id
JOIN products p ON s.product_id = p.id
WHERE o.status NOT IN ('CANCELLED', 'DRAFT')
GROUP BY oi.sku_id, s.sku_code, p.name;

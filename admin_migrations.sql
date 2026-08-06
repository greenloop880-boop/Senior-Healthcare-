-- 1. System Settings & Number Sequences
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS number_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_name VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'PRODUCT', 'SKU', 'PO'
    prefix VARCHAR(50),
    current_value INTEGER DEFAULT 0,
    padding INTEGER DEFAULT 6,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories & Brands
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id),
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(255),
    image VARCHAR(1000),
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- If categories already existed, ensure it has the new columns
DO $$
BEGIN
    BEGIN
        ALTER TABLE categories 
        ADD COLUMN slug VARCHAR(255) UNIQUE,
        ADD COLUMN parent_id UUID REFERENCES categories(id),
        ADD COLUMN display_order INTEGER DEFAULT 0,
        ADD COLUMN icon VARCHAR(255),
        ADD COLUMN image VARCHAR(1000),
        ADD COLUMN is_active BOOLEAN DEFAULT true,
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN deleted_by UUID;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column already exists in categories.';
    END;
END $$;

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    brand_code VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo VARCHAR(1000),
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Core Modifications (Soft Deletes and new fields)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS internal_code VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED', 'DISCONTINUED')),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id),
ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS url_slug VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS canonical_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS og_image VARCHAR(1000),
ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE skus
ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS mrp NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED', 'DISCONTINUED')),
ADD COLUMN IF NOT EXISTS package_dimensions JSONB,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS gstin VARCHAR(50),
ADD COLUMN IF NOT EXISTS pan VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255),
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER,
ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE warehouses
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS maximum_stock INTEGER,
ADD COLUMN IF NOT EXISTS safety_stock INTEGER,
ADD COLUMN IF NOT EXISTS incoming_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS damaged_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMP WITH TIME ZONE;

-- 4. Variant Engine
CREATE TABLE attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attribute_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
    value VARCHAR(255) NOT NULL,
    UNIQUE(attribute_id, value)
);

CREATE TABLE sku_attribute_values (
    sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
    attribute_value_id UUID REFERENCES attribute_values(id) ON DELETE CASCADE,
    PRIMARY KEY (sku_id, attribute_value_id)
);

-- 5. SKU Images
CREATE TABLE sku_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
    image_url VARCHAR(1000) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit Logging & Adjustments
-- Note: 'audit_logs' might conflict with the existing one if it exists. 
-- In supabase_schema.sql, audit_logs exists: id, user_id, action, entity_type, entity_id, old_data, new_data, created_at.
-- Let's drop it or alter it to match the new definition.
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID,
    ip_address VARCHAR(50),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID REFERENCES skus(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity_change INTEGER NOT NULL,
    reason_code VARCHAR(50) NOT NULL CHECK (reason_code IN ('DAMAGE', 'FOUND_EXTRA', 'LOST', 'EXPIRED', 'RETURN', 'CORRECTION')),
    notes TEXT,
    performed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SQL Views
-- inventory_dashboard
CREATE OR REPLACE VIEW v_inventory_dashboard AS
SELECT 
    i.sku_id,
    s.sku_code,
    p.name AS product_name,
    c.name AS category_name,
    b.name AS brand_name,
    i.warehouse_id,
    w.name AS warehouse_name,
    i.quantity_available,
    i.quantity_reserved,
    i.incoming_stock,
    i.damaged_stock,
    i.safety_stock,
    i.maximum_stock,
    s.purchase_cost,
    s.selling_price,
    (i.quantity_available * s.purchase_cost) AS cost_value,
    (i.quantity_available * s.selling_price) AS retail_value,
    (i.quantity_available * (s.selling_price - s.purchase_cost)) AS potential_profit,
    CASE 
        WHEN i.quantity_available <= 0 THEN 'OUT_OF_STOCK'
        WHEN i.quantity_available <= COALESCE(i.safety_stock, s.reorder_level) THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status
FROM inventory i
JOIN skus s ON i.sku_id = s.id
JOIN products p ON s.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
JOIN warehouses w ON i.warehouse_id = w.id;

-- 8. Batches & Serials
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID REFERENCES skus(id),
    warehouse_id UUID REFERENCES warehouses(id),
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12, 2),
    supplier_id UUID REFERENCES vendors(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'QUARANTINED', 'DEPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_serials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_batch_id UUID REFERENCES inventory_batches(id),
    serial_number VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD', 'DEFECTIVE', 'RETURNED')),
    sold_order_item_id UUID REFERENCES order_items(id),
    warranty_start DATE,
    warranty_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Returns Schema (Prepared)
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    customer_id UUID,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED')),
    return_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES returns(id),
    order_item_id UUID REFERENCES order_items(id),
    quantity INTEGER NOT NULL,
    condition VARCHAR(50) CHECK (condition IN ('SELLABLE', 'DAMAGED', 'DEFECTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES returns(id),
    payment_id UUID REFERENCES payments(id),
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


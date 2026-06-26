-- d:\ecom\supabase_orders_patch.sql

-- 1. Add missing fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00;

-- 2. Create a SECURITY DEFINER function to allow admins to search users and get orders with pagination
CREATE OR REPLACE FUNCTION admin_get_orders(
    p_search TEXT DEFAULT '',
    p_status TEXT DEFAULT 'All Status',
    p_date_filter TEXT DEFAULT 'All Dates',
    p_page_number INT DEFAULT 1,
    p_page_size INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR,
    total_amount NUMERIC,
    customer_id UUID,
    customer_email VARCHAR,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    customer_address JSONB,
    products_count BIGINT,
    payment_method VARCHAR,
    payment_status VARCHAR,
    payment_gateway_id VARCHAR,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_count BIGINT;
    v_start_date TIMESTAMP WITH TIME ZONE;
    v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Ensure the caller is an admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admins only.';
    END IF;

    -- Setup Date Filter
    IF p_date_filter = 'Today' THEN
        v_start_date := date_trunc('day', CURRENT_TIMESTAMP);
        v_end_date := v_start_date + interval '1 day';
    ELSIF p_date_filter = 'Last 7 Days' THEN
        v_start_date := date_trunc('day', CURRENT_TIMESTAMP - interval '7 days');
        v_end_date := CURRENT_TIMESTAMP + interval '1 day';
    ELSIF p_date_filter = 'Last 30 Days' THEN
        v_start_date := date_trunc('day', CURRENT_TIMESTAMP - interval '30 days');
        v_end_date := CURRENT_TIMESTAMP + interval '1 day';
    ELSIF p_date_filter = 'This Month' THEN
        v_start_date := date_trunc('month', CURRENT_TIMESTAMP);
        v_end_date := v_start_date + interval '1 month';
    ELSE
        v_start_date := '1970-01-01'::TIMESTAMP WITH TIME ZONE;
        v_end_date := '2999-12-31'::TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Create a temporary table to store the filtered orders to get total count
    CREATE TEMP TABLE tmp_filtered_orders ON COMMIT DROP AS
    SELECT 
        o.id,
        o.created_at,
        o.status,
        o.total_amount,
        o.customer_id,
        u.email::VARCHAR AS customer_email,
        oa.full_name AS customer_name,
        oa.phone AS customer_phone,
        jsonb_build_object(
            'address_line1', oa.address_line1,
            'address_line2', oa.address_line2,
            'city', oa.city,
            'state', oa.state,
            'pincode', oa.pincode,
            'country', oa.country
        ) AS customer_address,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id)::BIGINT AS products_count,
        p.gateway AS payment_method,
        p.status AS payment_status,
        p.gateway_payment_id AS payment_gateway_id
    FROM orders o
    LEFT JOIN auth.users u ON o.customer_id = u.id
    LEFT JOIN order_addresses oa ON o.id = oa.order_id AND oa.address_type = 'SHIPPING'
    LEFT JOIN payments p ON o.id = p.order_id
    WHERE 
        -- Date Filter
        (o.created_at >= v_start_date AND o.created_at < v_end_date)
        AND 
        -- Status Filter
        (p_status = 'All Status' OR o.status = p_status)
        AND 
        -- Search Filter
        (
            p_search = '' 
            OR o.id::TEXT ILIKE '%' || p_search || '%'
            OR u.email ILIKE '%' || p_search || '%'
            OR oa.full_name ILIKE '%' || p_search || '%'
            OR oa.phone ILIKE '%' || p_search || '%'
        );

    -- Get total count
    SELECT COUNT(*) INTO v_total_count FROM tmp_filtered_orders;

    -- Return paginated results
    RETURN QUERY
    SELECT 
        t.id,
        t.created_at,
        t.status,
        t.total_amount,
        t.customer_id,
        t.customer_email,
        t.customer_name,
        t.customer_phone,
        t.customer_address,
        t.products_count,
        t.payment_method,
        t.payment_status,
        t.payment_gateway_id,
        v_total_count
    FROM tmp_filtered_orders t
    ORDER BY t.created_at DESC
    LIMIT p_page_size
    OFFSET (p_page_number - 1) * p_page_size;
END;
$$;


-- 3. Create a SECURITY DEFINER function to get complete order details (including customer email)
CREATE OR REPLACE FUNCTION admin_get_order_details(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_json JSONB;
BEGIN
    -- Ensure the caller is an admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admins only.';
    END IF;

    SELECT jsonb_build_object(
        'id', o.id,
        'created_at', o.created_at,
        'status', o.status,
        'total_amount', o.total_amount,
        'admin_notes', o.admin_notes,
        'tax_amount', o.tax_amount,
        'shipping_amount', o.shipping_amount,
        'discount_amount', o.discount_amount,
        'customer', jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'shipping_address', (SELECT row_to_json(oa) FROM order_addresses oa WHERE oa.order_id = o.id AND oa.address_type = 'SHIPPING' LIMIT 1),
            'billing_address', (SELECT row_to_json(oa) FROM order_addresses oa WHERE oa.order_id = o.id AND oa.address_type = 'BILLING' LIMIT 1)
        ),
        'items', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'total_price', oi.total_price,
                    'sku', jsonb_build_object(
                        'sku_code', s.sku_code,
                        'variant_name', s.variant_name,
                        'product', jsonb_build_object(
                            'name', pr.name,
                            'image_url', pr.image_url,
                            'images', pr.images
                        )
                    )
                )
            ), '[]'::jsonb)
            FROM order_items oi
            JOIN skus s ON oi.sku_id = s.id
            JOIN products pr ON s.product_id = pr.id
            WHERE oi.order_id = o.id
        ),
        'payments', (
            SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
            FROM payments p
            WHERE p.order_id = o.id
        ),
        'shipments', (
            SELECT COALESCE(jsonb_agg(row_to_json(sh)), '[]'::jsonb)
            FROM shipments sh
            WHERE sh.order_id = o.id
        ),
        'timeline', (
            SELECT COALESCE(jsonb_agg(row_to_json(osh) ORDER BY osh.created_at ASC), '[]'::jsonb)
            FROM order_status_history osh
            WHERE osh.order_id = o.id
        )
    )
    INTO v_order_json
    FROM orders o
    LEFT JOIN auth.users u ON o.customer_id = u.id
    WHERE o.id = p_order_id;

    RETURN v_order_json;
END;
$$;

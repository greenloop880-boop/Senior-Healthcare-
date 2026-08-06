CREATE OR REPLACE FUNCTION create_cod_order(
    p_customer_id UUID,
    p_total_amount NUMERIC,
    p_address JSONB,
    p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
BEGIN
    -- 1. Create Order
    INSERT INTO orders (customer_id, status, total_amount)
    VALUES (p_customer_id, 'PENDING', p_total_amount)
    RETURNING id INTO v_order_id;

    -- 2. Create Address
    INSERT INTO order_addresses (order_id, address_type, full_name, phone, address_line1, address_line2, city, state, pincode, country)
    VALUES (
        v_order_id, 
        'SHIPPING', 
        p_address->>'full_name', 
        p_address->>'phone', 
        p_address->>'address_line1', 
        p_address->>'address_line2', 
        p_address->>'city', 
        p_address->>'state', 
        p_address->>'pincode', 
        'India'
    );

    -- 3. Create Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (order_id, sku_id, quantity, unit_price, unit_cost)
        VALUES (
            v_order_id, 
            (v_item->>'sku_id')::UUID, 
            (v_item->>'quantity')::INT, 
            (v_item->>'unit_price')::NUMERIC, 
            0
        );
    END LOOP;

    -- 4. Create Payment
    INSERT INTO payments (order_id, gateway, amount, status)
    VALUES (v_order_id, 'cod', p_total_amount, 'CREATED');

    RETURN v_order_id;
END;
$$;

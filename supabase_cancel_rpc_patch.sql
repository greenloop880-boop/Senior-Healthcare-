CREATE OR REPLACE FUNCTION customer_cancel_order(p_order_id UUID)
RETURNS void AS $$
BEGIN
  -- Verify the order belongs to the calling user
  IF NOT EXISTS (
    SELECT 1 FROM orders WHERE id = p_order_id AND customer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Order not found or you do not have permission';
  END IF;

  -- Verify the order is not already shipped
  IF EXISTS (
    SELECT 1 FROM shipments WHERE order_id = p_order_id AND status IN ('SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED')
  ) THEN
    RAISE EXCEPTION 'Order has already been shipped';
  END IF;

  -- Update order status
  UPDATE orders SET status = 'CANCELLED' WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

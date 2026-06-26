-- Update all current SKUs to have a selling price and MRP of 1 Rupee for testing
UPDATE skus
SET 
    selling_price = 1.00,
    mrp = 1.00
WHERE deleted_at IS NULL;

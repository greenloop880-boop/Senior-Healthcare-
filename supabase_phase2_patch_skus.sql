-- 1. Add variant_name column to skus table
ALTER TABLE skus ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- 2. Update existing SKUs to have a default variant_name based on their SKU code 
--    (Optional, but helps so they don't look blank immediately)
UPDATE skus 
SET variant_name = sku_code 
WHERE variant_name IS NULL OR variant_name = '';

-- 3. Reload schema
NOTIFY pgrst, 'reload schema';

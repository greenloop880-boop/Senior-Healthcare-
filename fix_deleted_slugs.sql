-- Rename the slugs and internal codes of all currently deleted products 
-- so they stop blocking you from creating new products with the same name.

UPDATE products 
SET 
    slug = slug || '-del-' || EXTRACT(EPOCH FROM deleted_at)::text,
    url_slug = url_slug || '-del-' || EXTRACT(EPOCH FROM deleted_at)::text,
    internal_code = internal_code || '-del-' || EXTRACT(EPOCH FROM deleted_at)::text
WHERE deleted_at IS NOT NULL 
AND slug NOT LIKE '%-del-%';

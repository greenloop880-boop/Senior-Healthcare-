-- d:\ecom\supabase_phase2_patch.sql

-- =====================================================================================
-- 1. CATEGORIES TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    image_url VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- 2. CONCERNS & JUNCTION TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS concerns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) UNIQUE NOT NULL,
    image_url VARCHAR(1000),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_concerns (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    concern_id UUID REFERENCES concerns(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, concern_id)
);

-- =====================================================================================
-- 3. ALTER EXISTING TABLES
-- =====================================================================================

-- Alter CATEGORIES & CONCERNS (in case they were created without image_url)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);
ALTER TABLE concerns ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);

-- Alter PRODUCTS
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
-- We already added these manually, but ensuring idempotency
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Alter SKUS
ALTER TABLE skus ADD COLUMN IF NOT EXISTS mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- =====================================================================================
-- 4. APPLY RLS POLICIES
-- =====================================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_concerns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin All Access on categories" ON categories;
DROP POLICY IF EXISTS "Admin All Access on concerns" ON concerns;
DROP POLICY IF EXISTS "Admin All Access on product_concerns" ON product_concerns;

CREATE POLICY "Admin All Access on categories" ON categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin All Access on concerns" ON concerns FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin All Access on product_concerns" ON product_concerns FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Ensure the public can READ (assuming we want customers to see products, categories, etc in the future)
-- For now, the user requested Admin access first, but for standard e-com, READ is public.
-- We will leave it as Admin-only for now until they build the customer frontend, as they specified "Admin All Access".

-- Grant permissions to authenticated role for new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;

-- Fix the missing columns on the categories table.
-- Using IF NOT EXISTS ensures it won't fail if the column is already there.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image VARCHAR(1000);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_by UUID;

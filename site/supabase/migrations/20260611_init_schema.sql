-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT,
    link TEXT
);

-- Create concerns table
CREATE TABLE IF NOT EXISTS public.concerns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT,
    link TEXT
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    category_title TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    mrp NUMERIC,
    discount TEXT,
    rating NUMERIC,
    reviews_count INTEGER,
    image_url TEXT,
    specs JSONB
);

-- Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    date TEXT,
    read_time TEXT,
    author TEXT,
    image_url TEXT,
    content JSONB
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Create Policies to allow public read access
CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to concerns" ON public.concerns FOR SELECT USING (true);
CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public read access to blogs" ON public.blogs FOR SELECT USING (true);

-- Create Policies to allow all operations for anon (temporarily for data seeding)
-- IMPORTANT: In a production environment, you should remove these after seeding!
CREATE POLICY "Allow anon insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert concerns" ON public.concerns FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert blogs" ON public.blogs FOR INSERT WITH CHECK (true);

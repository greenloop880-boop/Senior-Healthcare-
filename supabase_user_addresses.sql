-- d:\ecom\supabase_user_addresses.sql

-- 1. Create User Addresses Table
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure a user can only have one default address using a unique partial index
CREATE UNIQUE INDEX idx_user_addresses_default ON user_addresses(user_id) WHERE is_default = true;

-- 2. Trigger to manage maximum 10 addresses
CREATE OR REPLACE FUNCTION enforce_max_addresses()
RETURNS TRIGGER AS $$
DECLARE
    address_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO address_count FROM user_addresses WHERE user_id = NEW.user_id;
    IF address_count >= 10 THEN
        RAISE EXCEPTION 'Maximum of 10 addresses allowed per user.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_max_addresses
BEFORE INSERT ON user_addresses
FOR EACH ROW
EXECUTE FUNCTION enforce_max_addresses();

-- 3. Row Level Security Policies
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addresses"
    ON user_addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
    ON user_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
    ON user_addresses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
    ON user_addresses FOR DELETE
    USING (auth.uid() = user_id);

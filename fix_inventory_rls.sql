-- Enable public read access to the inventory table so unauthenticated users can see stock availability
DROP POLICY IF EXISTS "Public Read Access on inventory" ON inventory;
CREATE POLICY "Public Read Access on inventory" ON inventory FOR SELECT USING (true);

/*
  # Add Restaurant Authentication System

  ## Overview
  Enables restaurants to sign up, log in, and manage their own accounts with authentication.
  Each restaurant owner gets their own account to view customers and manage their business.

  ## Changes to Existing Tables
  
  ### `restaurants`
  - Add `auth_id` (uuid, unique) - Links restaurant to Supabase auth.users
  - Add `email` (text, unique) - Restaurant owner's email for login
  - Add `phone` (text) - Restaurant contact phone
  - Add `owner_name` (text) - Name of restaurant owner/manager
  - Add `updated_at` (timestamptz) - Track last update time

  ## Security Changes
  
  ### RLS Policies for restaurants table
  - Restaurant owners can view and update their own restaurant data
  - Restaurant owners can view their customers
  - Restaurant owners can view coupons from their restaurant
  - Public users can still view active restaurants (for signup)

  ## Important Notes
  - Each restaurant is linked to a Supabase auth user
  - Restaurant owners authenticate using email/password
  - Customers and restaurant owners are separate user types
  - Restaurant owners can only access their own data
*/

-- Add new columns to restaurants table
ALTER TABLE restaurants 
  ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS email text UNIQUE,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_auth_id ON restaurants(auth_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_email ON restaurants(email);

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON restaurants;
DROP POLICY IF EXISTS "Authenticated users can view all restaurants" ON restaurants;

-- RLS Policies for restaurants table

-- Public can view active restaurants (for customer signup dropdown)
CREATE POLICY "Public can view active restaurants"
  ON restaurants FOR SELECT
  TO anon
  USING (is_active = true);

-- Authenticated users can view active restaurants
CREATE POLICY "Authenticated users can view active restaurants"
  ON restaurants FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = auth_id);

-- Restaurant owners can update their own restaurant
CREATE POLICY "Restaurant owners can update own restaurant"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Allow restaurant signup (insert with auth_id)
CREATE POLICY "Allow restaurant signup"
  ON restaurants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_id);

-- Update customers RLS to allow restaurant owners to view their customers
DROP POLICY IF EXISTS "Restaurant owners can view their customers" ON customers;
CREATE POLICY "Restaurant owners can view their customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = customers.restaurant_id
      AND restaurants.auth_id = auth.uid()
    )
  );

-- Update coupons RLS to allow restaurant owners to view their coupons
DROP POLICY IF EXISTS "Restaurant owners can view their coupons" ON coupons;
CREATE POLICY "Restaurant owners can view their coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = coupons.restaurant_id
      AND restaurants.auth_id = auth.uid()
    )
  );

-- Update stamps table to add restaurant_id if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stamps' AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE stamps ADD COLUMN restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_stamps_restaurant ON stamps(restaurant_id);
  END IF;
END $$;

-- Allow restaurant owners to view stamps for their customers
DROP POLICY IF EXISTS "Restaurant owners can view their customers' stamps" ON stamps;
CREATE POLICY "Restaurant owners can view their customers' stamps"
  ON stamps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = stamps.restaurant_id
      AND restaurants.auth_id = auth.uid()
    )
  );

-- Create a function to get restaurant by auth_id (useful for queries)
CREATE OR REPLACE FUNCTION get_restaurant_id_by_auth()
RETURNS uuid AS $$
  SELECT id FROM restaurants WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_restaurant_id_by_auth() TO authenticated;

/*
  # Add Restaurants Table with Multi-Restaurant Support

  ## Overview
  Adds restaurants table to enable multi-restaurant support with unique QR codes
  per restaurant while showing all restaurants in dropdown for social proof.

  ## New Tables
  
  ### `restaurants`
  Stores restaurant partner information
  - `id` (uuid, primary key) - Unique restaurant identifier
  - `name` (text, unique) - Restaurant business name
  - `slug` (text, unique) - URL-friendly identifier for QR codes
  - `location` (text) - Restaurant address/location
  - `is_active` (boolean) - Whether restaurant is currently active
  - `created_at` (timestamptz) - When restaurant was added

  ## Changes to Existing Tables
  
  ### `customers`
  - Add `restaurant_id` (uuid) - Links customer to the restaurant they signed up at
  
  ### `coupons`
  - Add `restaurant_id` (uuid) - Links coupon to specific restaurant for redemption

  ## Security
  - Enable RLS on restaurants table
  - Anyone can view active restaurants (for dropdown display)
  - Only authenticated staff can manage restaurants

  ## Sample Data
  Includes 5 sample restaurants to demonstrate social proof in dropdown
*/

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  location text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add restaurant_id to customers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add restaurant_id to coupons table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE coupons ADD COLUMN restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_restaurant ON coupons(restaurant_id);

-- Enable Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurants table

-- Anyone can view active restaurants (for dropdown display)
CREATE POLICY "Anyone can view active restaurants"
  ON restaurants FOR SELECT
  TO anon
  USING (is_active = true);

-- Authenticated users can view all restaurants (staff portal)
CREATE POLICY "Authenticated users can view all restaurants"
  ON restaurants FOR SELECT
  TO authenticated
  USING (true);

-- Insert sample restaurants for demonstration
INSERT INTO restaurants (name, slug, location) VALUES
  ('The Golden Spoon', 'golden-spoon', '123 Main St, Downtown'),
  ('Bella Italia', 'bella-italia', '456 Oak Ave, West Side'),
  ('Dragon Palace', 'dragon-palace', '789 Pine Rd, Chinatown'),
  ('Le Bistro', 'le-bistro', '321 Elm St, Arts District'),
  ('Ocean View Grill', 'ocean-view', '654 Beach Blvd, Waterfront')
ON CONFLICT (slug) DO NOTHING;

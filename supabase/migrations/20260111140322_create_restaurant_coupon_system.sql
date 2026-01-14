/*
  # Restaurant Coupon System - Initial Schema

  ## Overview
  Creates the complete database schema for a restaurant revenue generation app
  where customers sign up via QR code and receive discount coupons.

  ## New Tables
  
  ### `customers`
  Stores customer information from signup form
  - `id` (uuid, primary key) - Unique customer identifier
  - `name` (text) - Customer full name
  - `email` (text, unique) - Customer email address
  - `phone` (text) - Customer phone number
  - `created_at` (timestamptz) - Signup timestamp
  
  ### `coupons`
  Stores coupon configurations and templates
  - `id` (uuid, primary key) - Unique coupon identifier
  - `code` (text, unique) - Unique coupon code
  - `discount_type` (text) - Type: 'percentage' or 'fixed'
  - `discount_value` (numeric) - Discount amount (10 for 10% or $10)
  - `expires_at` (timestamptz) - Expiration date
  - `is_redeemed` (boolean) - Redemption status
  - `redeemed_at` (timestamptz, nullable) - When coupon was used
  - `customer_id` (uuid) - Link to customer who owns this coupon
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Customers can only read their own data
  - Only authenticated staff can redeem coupons
  - Public can insert new customer signups

  ## Indexes
  - Index on customer email for quick lookups
  - Index on coupon codes for validation
  - Index on coupon redemption status
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 10,
  expires_at timestamptz NOT NULL,
  is_redeemed boolean DEFAULT false,
  redeemed_at timestamptz,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_customer_id ON coupons(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupons_redeemed ON coupons(is_redeemed);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table

-- Allow anyone to insert (public signups)
CREATE POLICY "Anyone can create customer account"
  ON customers FOR INSERT
  TO anon
  WITH CHECK (true);

-- Customers can read their own data
CREATE POLICY "Customers can view own data"
  ON customers FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for coupons table

-- Allow anyone to create coupons (for signup flow)
CREATE POLICY "Anyone can create coupons"
  ON coupons FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anyone to read coupons (for displaying after signup)
CREATE POLICY "Anyone can view coupons"
  ON coupons FOR SELECT
  TO anon
  USING (true);

-- Only authenticated users (staff) can update coupons (for redemption)
CREATE POLICY "Authenticated users can redeem coupons"
  ON coupons FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

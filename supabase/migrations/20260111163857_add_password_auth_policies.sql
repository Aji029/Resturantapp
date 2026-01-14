/*
  # Add Password Authentication and Update RLS Policies

  ## Overview
  Updates RLS policies to support password-based authentication through Supabase Auth.
  Ensures that authenticated users can manage their own data securely.

  ## Changes Made

  ### 1. Updated Customer Policies
  - Allow authenticated users to view their own customer record
  - Allow authenticated users to insert their own customer record during signup
  - Restrict updates to only the authenticated user's own data

  ### 2. Updated Coupon Policies
  - Allow authenticated users to view their own coupons
  - Maintain existing policies for coupon creation and redemption

  ### 3. Security Improvements
  - All policies now check `auth.uid()` for proper authentication
  - Staff members retain elevated permissions
  - Unauthenticated users can still view basic restaurant info

  ## Important Notes
  1. Users must be authenticated via Supabase Auth to access their data
  2. The `user_id` column in customers links to `auth.users(id)`
  3. Email/password authentication is now fully integrated
  4. Staff permissions are preserved through `is_staff` flag
*/

-- Drop existing customer policies to recreate them
DROP POLICY IF EXISTS "Authenticated users can insert own customer record" ON customers;
DROP POLICY IF EXISTS "Users can view own customer data" ON customers;
DROP POLICY IF EXISTS "Users can update own customer data" ON customers;

-- Customer policies for authenticated users
CREATE POLICY "Authenticated users can insert own customer record"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own customer data"
  ON customers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_staff = true
  );

CREATE POLICY "Users can update own customer data"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update coupon policies to work with authenticated users
DROP POLICY IF EXISTS "Users can view own coupons" ON coupons;

CREATE POLICY "Users can view own coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.user_id = auth.uid() 
      AND customers.is_staff = true
    )
  );

-- Allow authenticated users to receive coupons during signup
DROP POLICY IF EXISTS "Authenticated users can receive signup coupons" ON coupons;

CREATE POLICY "Authenticated users can receive signup coupons"
  ON coupons FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.user_id = auth.uid() 
      AND customers.is_staff = true
    )
  );

-- Update coupon redemption policy
DROP POLICY IF EXISTS "Staff can redeem coupons" ON coupons;

CREATE POLICY "Staff can redeem coupons"
  ON coupons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.user_id = auth.uid() 
      AND customers.is_staff = true
    )
  );

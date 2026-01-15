/*
  # Fix Customer SELECT RLS Hanging Issue

  1. Problem
    - Existing RLS policies on customers table are causing SELECT queries to hang
    - Users logging in cannot view their own customer data due to complex policy checks
  
  2. Changes
    - Drop all existing SELECT policies on customers table
    - Create simple, direct policies:
      - Users can view their own customer record by user_id
      - Restaurant owners can view customers linked to their restaurant
  
  3. Security
    - Maintains security by checking auth.uid() matches user_id
    - Restaurant owners can only see customers linked to their restaurant_id
*/

-- Drop existing complex SELECT policies on customers
DROP POLICY IF EXISTS "Users can view own customer data" ON customers;
DROP POLICY IF EXISTS "Restaurant owners can view their customers" ON customers;

-- Create simple policy for users to view their own customer data
CREATE POLICY "Users can read own customer record"
  ON customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for restaurants to view their customers
CREATE POLICY "Restaurants can read their customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = customers.restaurant_id
        AND restaurants.auth_id = auth.uid()
    )
  );
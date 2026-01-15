/*
  # Fix Customer RLS Policies
  
  1. Purpose
    - Remove problematic anonymous policy that allows all data access
    - Ensure clean, secure policies for customer data access
  
  2. Changes
    - Drop the insecure "Customers can view own data" anon policy
    - This policy was allowing unrestricted access and causing conflicts
  
  3. Security
    - Maintains secure authenticated access via existing policies
    - Removes security vulnerability
*/

-- Drop the problematic anonymous policy
DROP POLICY IF EXISTS "Customers can view own data" ON customers;

-- Ensure we have the correct authenticated policy (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' 
    AND policyname = 'Users can view own customer data'
  ) THEN
    CREATE POLICY "Users can view own customer data"
      ON customers
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR is_staff = true);
  END IF;
END $$;

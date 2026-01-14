/*
  # Fix Customer Insert Policies
  
  ## Problem
  Multiple conflicting INSERT policies are preventing customer records from being created.
  Users can sign up (auth.users created) but customer records fail to insert.
  
  ## Changes
  1. Remove all conflicting INSERT policies for customers
  2. Add single, clear INSERT policy for authenticated users
  3. Ensure customers can be created during signup
  
  ## Security
  - Authenticated users can only insert customer records with their own user_id
  - This allows signup to work correctly while maintaining security
*/

-- Drop all existing INSERT policies for customers
DROP POLICY IF EXISTS "Anyone can create customer account" ON customers;
DROP POLICY IF EXISTS "Authenticated users can create customer account" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert own customer record" ON customers;

-- Create single, clear INSERT policy
CREATE POLICY "Authenticated users can create their customer record"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

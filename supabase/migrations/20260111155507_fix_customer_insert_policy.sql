/*
  # Fix Customer Insert Policy for Authenticated Users

  ## Problem
  The customers table only allows anonymous (anon) users to insert records,
  but after Supabase Auth signup, users become authenticated. This causes
  signup failures when trying to create customer records.

  ## Solution
  Add an INSERT policy for authenticated users on the customers table.

  ## Changes
  1. Add policy allowing authenticated users to insert customer records
  2. Ensure policy only allows users to create their own customer record

  ## Security
  - Authenticated users can only insert customer records linked to their own user_id
  - Prevents users from creating customer records for other users
*/

-- Add policy for authenticated users to insert customer records
CREATE POLICY "Authenticated users can create customer account"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
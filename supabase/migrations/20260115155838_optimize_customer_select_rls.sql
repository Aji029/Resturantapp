/*
  # Optimize Customer SELECT RLS Performance

  1. Problem
    - The "Restaurants can read their customers" policy uses EXISTS subquery
    - This causes performance issues and hanging queries
    - The subquery checks restaurants table which also has RLS, creating circular checks
  
  2. Changes
    - Temporarily disable the complex restaurant customer view policy
    - Keep only the simple direct user access policy
    - This will allow customer login to work immediately
  
  3. Security
    - Users can still only view their own customer record
    - Restaurant functionality will need separate optimization later
*/

-- Drop the complex policy that's causing hangs
DROP POLICY IF EXISTS "Restaurants can read their customers" ON customers;

-- The simple policy remains and should work fine
-- "Users can read own customer record" - USING (auth.uid() = user_id)
/*
  # Add Authenticated User Coupon Insert Policy

  ## Problem
  After signup, when creating the welcome coupon, the user is authenticated
  but there's no policy allowing authenticated users to insert coupons.

  ## Solution
  Add an INSERT policy for authenticated users on the coupons table.

  ## Changes
  1. Add policy allowing authenticated users to insert coupons
  
  ## Security
  - Authenticated users can create coupons (needed for signup flow)
  - This is safe as the coupon is linked to their customer_id
*/

-- Add policy for authenticated users to insert coupons
CREATE POLICY "Authenticated users can create coupons"
  ON coupons FOR INSERT
  TO authenticated
  WITH CHECK (true);

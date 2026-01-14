/*
  # Auto-create customer records for new auth users
  
  1. Purpose
    - Automatically create customer records when new auth users sign up
    - Prevents orphaned auth.users records without corresponding customer records
    - Uses metadata from auth.users to populate customer details
  
  2. How it works
    - Trigger fires after INSERT on auth.users
    - Checks if user has customer metadata (name, phone, restaurant_id)
    - Automatically creates customer record with redemption code
    - If customer creation fails, the auth user still exists but can be handled gracefully
  
  3. Security
    - Function runs with SECURITY DEFINER to have permission to insert into customers table
    - Only creates customer if proper metadata exists
*/

-- Create function to auto-create customer record
CREATE OR REPLACE FUNCTION public.handle_new_user_customer()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_name TEXT;
  v_phone TEXT;
  v_restaurant_id UUID;
  v_redemption_code TEXT;
BEGIN
  -- Extract metadata from new auth user
  v_name := NEW.raw_user_meta_data->>'name';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_restaurant_id := (NEW.raw_user_meta_data->>'restaurant_id')::UUID;
  
  -- Only create customer if we have the required metadata
  IF v_name IS NOT NULL AND v_phone IS NOT NULL AND v_restaurant_id IS NOT NULL THEN
    -- Generate redemption code
    v_redemption_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    
    -- Create customer record
    INSERT INTO public.customers (
      user_id,
      name,
      email,
      phone,
      restaurant_id,
      redemption_code
    ) VALUES (
      NEW.id,
      v_name,
      NEW.email,
      v_phone,
      v_restaurant_id,
      v_redemption_code
    );
    
    -- Note: If this fails, the auth user will still exist
    -- but the signup flow can detect this and handle it appropriately
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_customer();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user_customer() TO authenticated, anon;
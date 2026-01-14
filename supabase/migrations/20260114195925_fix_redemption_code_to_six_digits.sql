/*
  # Fix Redemption Code to 6-Digit Format

  1. Problem
    - Redemption codes are currently generated as 8-character alphanumeric strings (e.g., "A1B2C3D4")
    - Restaurant portal expects 6-digit numeric codes
    - Customers cannot successfully redeem stamps using displayed codes

  2. Changes
    - Update the trigger function to generate 6-digit numeric codes (100000-999999)
    - Update all existing customer records to have proper 6-digit numeric codes
    - Ensures uniqueness of redemption codes

  3. Security
    - Maintains existing RLS policies
    - No changes to permissions or access control
*/

-- Update the function to generate 6-digit numeric codes
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
  v_attempts INT := 0;
  v_max_attempts INT := 10;
  v_code_exists BOOLEAN;
BEGIN
  -- Extract metadata from new auth user
  v_name := NEW.raw_user_meta_data->>'name';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_restaurant_id := (NEW.raw_user_meta_data->>'restaurant_id')::UUID;
  
  -- Only create customer if we have the required metadata
  IF v_name IS NOT NULL AND v_phone IS NOT NULL AND v_restaurant_id IS NOT NULL THEN
    -- Generate unique 6-digit redemption code
    LOOP
      -- Generate random 6-digit number (100000-999999)
      v_redemption_code := LPAD((FLOOR(RANDOM() * 900000) + 100000)::TEXT, 6, '0');
      
      -- Check if code already exists
      SELECT EXISTS(
        SELECT 1 FROM public.customers WHERE redemption_code = v_redemption_code
      ) INTO v_code_exists;
      
      -- Exit loop if code is unique or max attempts reached
      EXIT WHEN NOT v_code_exists OR v_attempts >= v_max_attempts;
      
      v_attempts := v_attempts + 1;
    END LOOP;
    
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update existing customers to have 6-digit numeric redemption codes
DO $$
DECLARE
  customer_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
  attempts INT;
BEGIN
  -- Loop through all customers
  FOR customer_record IN SELECT id, redemption_code FROM customers
  LOOP
    -- Only update if current code is not already a 6-digit number
    IF customer_record.redemption_code !~ '^\d{6}$' THEN
      attempts := 0;
      
      -- Generate unique code
      LOOP
        -- Generate random 6-digit number
        new_code := LPAD((FLOOR(RANDOM() * 900000) + 100000)::TEXT, 6, '0');
        
        -- Check if code exists
        SELECT EXISTS(
          SELECT 1 FROM customers WHERE redemption_code = new_code AND id != customer_record.id
        ) INTO code_exists;
        
        EXIT WHEN NOT code_exists OR attempts >= 10;
        attempts := attempts + 1;
      END LOOP;
      
      -- Update customer with new code
      UPDATE customers
      SET redemption_code = new_code
      WHERE id = customer_record.id;
    END IF;
  END LOOP;
END $$;
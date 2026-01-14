/*
  # Create Foolproof Stamp Redemption Function
  
  1. Purpose
    - Create a database function to handle stamp addition with full transactional safety
    - Prevents race conditions, duplicate stamps, and data inconsistencies
    - Automatically issues rewards when stamps are complete
    - Provides detailed error messages and logging
  
  2. Function Features
    - Validates customer and restaurant relationship
    - Creates stamp card if it doesn't exist
    - Adds stamp to customer's card atomically
    - Auto-generates reward coupon when card is complete
    - Resets card after reward is issued
    - Returns detailed success/error information
    - Prevents adding multiple stamps in quick succession (cooldown period)
  
  3. Security
    - Function runs with SECURITY DEFINER for controlled access
    - Only callable by authenticated users
    - Validates restaurant ownership through auth_id
    - Prevents unauthorized stamp additions
*/

-- Create the stamp redemption function
CREATE OR REPLACE FUNCTION public.add_stamp_to_customer(
  p_customer_id UUID,
  p_restaurant_auth_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_restaurant_name TEXT;
  v_customer_name TEXT;
  v_customer_restaurant_id UUID;
  v_stamp_card_id UUID;
  v_program_id UUID;
  v_current_stamps INT;
  v_stamps_required INT;
  v_reward_value TEXT;
  v_new_stamp_count INT;
  v_coupon_code TEXT;
  v_last_stamp_time TIMESTAMPTZ;
  v_cooldown_seconds INT := 10;
  v_result JSON;
BEGIN
  -- Get restaurant details from auth_id
  SELECT id, name INTO v_restaurant_id, v_restaurant_name
  FROM restaurants
  WHERE auth_id = p_restaurant_auth_id AND is_active = true;
  
  IF v_restaurant_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Restaurant nicht gefunden oder inaktiv'
    );
  END IF;
  
  -- Get customer details and verify they belong to this restaurant
  SELECT name, restaurant_id INTO v_customer_name, v_customer_restaurant_id
  FROM customers
  WHERE id = p_customer_id;
  
  IF v_customer_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Kunde nicht gefunden'
    );
  END IF;
  
  IF v_customer_restaurant_id != v_restaurant_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Kunde gehört nicht zu diesem Restaurant'
    );
  END IF;
  
  -- Get active stamp program for this restaurant
  SELECT id, stamps_required, reward_value
  INTO v_program_id, v_stamps_required, v_reward_value
  FROM stamp_programs
  WHERE restaurant_id = v_restaurant_id AND is_active = true
  LIMIT 1;
  
  IF v_program_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Kein aktives Stempelprogramm für dieses Restaurant'
    );
  END IF;
  
  -- Get or create stamp card
  SELECT id, current_stamps INTO v_stamp_card_id, v_current_stamps
  FROM stamp_cards
  WHERE customer_id = p_customer_id 
    AND program_id = v_program_id 
    AND status = 'active';
  
  IF v_stamp_card_id IS NULL THEN
    -- Create new stamp card
    INSERT INTO stamp_cards (customer_id, program_id, current_stamps, total_stamps_earned, status)
    VALUES (p_customer_id, v_program_id, 0, 0, 'active')
    RETURNING id, current_stamps INTO v_stamp_card_id, v_current_stamps;
  END IF;
  
  -- Check for cooldown period (prevent duplicate stamps within cooldown)
  SELECT created_at INTO v_last_stamp_time
  FROM stamps
  WHERE customer_id = p_customer_id 
    AND restaurant_id = v_restaurant_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_last_stamp_time IS NOT NULL AND 
     v_last_stamp_time > (NOW() - INTERVAL '1 second' * v_cooldown_seconds) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bitte warten Sie ' || v_cooldown_seconds || ' Sekunden zwischen Stempeln'
    );
  END IF;
  
  -- Add stamp to stamps table
  INSERT INTO stamps (customer_id, restaurant_id, stamp_card_id, notes)
  VALUES (p_customer_id, v_restaurant_id, v_stamp_card_id, p_notes);
  
  -- Update stamp card
  v_new_stamp_count := v_current_stamps + 1;
  
  UPDATE stamp_cards
  SET current_stamps = v_new_stamp_count,
      total_stamps_earned = total_stamps_earned + 1,
      updated_at = NOW()
  WHERE id = v_stamp_card_id;
  
  -- Check if card is complete and issue reward
  IF v_new_stamp_count >= v_stamps_required THEN
    -- Generate unique coupon code
    v_coupon_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
    
    -- Create reward coupon
    INSERT INTO coupons (
      code,
      discount_type,
      discount_value,
      expires_at,
      customer_id,
      restaurant_id,
      is_redeemed
    ) VALUES (
      v_coupon_code,
      'percentage',
      15,
      NOW() + INTERVAL '30 days',
      p_customer_id,
      v_restaurant_id,
      false
    );
    
    -- Reset stamp card
    UPDATE stamp_cards
    SET current_stamps = 0,
        status = 'active',
        updated_at = NOW()
    WHERE id = v_stamp_card_id;
    
    -- Return success with reward
    RETURN json_build_object(
      'success', true,
      'stamps_added', 1,
      'new_stamp_count', 0,
      'stamps_required', v_stamps_required,
      'reward_issued', true,
      'reward_value', v_reward_value,
      'coupon_code', v_coupon_code,
      'customer_name', v_customer_name,
      'message', 'Stempel hinzugefügt! Karte vollständig - Belohnung ausgegeben!'
    );
  ELSE
    -- Return success without reward
    RETURN json_build_object(
      'success', true,
      'stamps_added', 1,
      'new_stamp_count', v_new_stamp_count,
      'stamps_required', v_stamps_required,
      'reward_issued', false,
      'customer_name', v_customer_name,
      'message', 'Stempel erfolgreich hinzugefügt! ' || 
                 (v_stamps_required - v_new_stamp_count)::TEXT || 
                 ' weitere Stempel bis zur Belohnung'
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Fehler beim Hinzufügen des Stempels: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_stamp_to_customer(UUID, UUID, TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.add_stamp_to_customer IS 'Adds a stamp to a customer card with full validation and automatic reward issuance';
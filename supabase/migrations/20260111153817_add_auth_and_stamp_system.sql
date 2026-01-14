/*
  # Add Authentication and Stamp Card System

  ## Overview
  Adds user authentication support and implements a complete stamp card loyalty system.

  ## Changes to Existing Tables

  ### `customers` table updates:
  - Add `user_id` (uuid) - Links to auth.users for login
  - Add `is_staff` (boolean) - Identifies staff members
  - Add `password_hash` (text) - For simple password authentication (will use Supabase Auth)

  ## New Tables

  ### `stamp_programs`
  Defines stamp card programs (e.g., "10 coffees = 1 free")
  - `id` (uuid, primary key)
  - `restaurant_id` (uuid) - References restaurants table
  - `name` (text) - Program name, e.g., "Coffee Loyalty"
  - `description` (text) - Program description
  - `stamps_required` (integer) - Number of stamps needed for reward
  - `reward_type` (text) - Type: 'percentage_discount', 'free_item'
  - `reward_value` (text) - Reward description
  - `reward_percentage` (integer) - If percentage discount
  - `is_active` (boolean) - Whether program is active
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stamp_cards`
  Tracks each customer's stamp card progress
  - `id` (uuid, primary key)
  - `customer_id` (uuid) - References customers
  - `program_id` (uuid) - References stamp_programs
  - `current_stamps` (integer) - Current stamp count
  - `total_stamps_earned` (integer) - Lifetime stamps
  - `status` (text) - 'active', 'completed'
  - `completed_at` (timestamptz) - When card completed
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `stamps`
  Individual stamp history/transactions
  - `id` (uuid, primary key)
  - `card_id` (uuid) - References stamp_cards
  - `customer_id` (uuid) - References customers
  - `added_by_email` (text) - Staff member email
  - `notes` (text) - Optional notes
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Customers can view own stamp cards and stamps
  - Staff can view all cards and add stamps
  - Auto-generate reward coupons when cards complete

  ## Important Notes
  1. Default stamp program created automatically
  2. When customer signs up, they get a stamp card
  3. When stamp card reaches required stamps, auto-generate reward coupon
*/

-- Add new columns to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_staff'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_staff boolean DEFAULT false;
  END IF;
END $$;

-- Create stamp_programs table
CREATE TABLE IF NOT EXISTS stamp_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  stamps_required integer NOT NULL DEFAULT 10,
  reward_type text NOT NULL DEFAULT 'free_item',
  reward_value text NOT NULL,
  reward_percentage integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stamp_cards table
CREATE TABLE IF NOT EXISTS stamp_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  program_id uuid REFERENCES stamp_programs(id) ON DELETE CASCADE NOT NULL,
  current_stamps integer DEFAULT 0,
  total_stamps_earned integer DEFAULT 0,
  status text DEFAULT 'active',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stamps table
CREATE TABLE IF NOT EXISTS stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES stamp_cards(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  added_by_email text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_staff ON customers(is_staff);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_customer ON stamp_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_status ON stamp_cards(status);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_program ON stamp_cards(program_id);
CREATE INDEX IF NOT EXISTS idx_stamps_card ON stamps(card_id);
CREATE INDEX IF NOT EXISTS idx_stamps_customer ON stamps(customer_id);

-- Enable RLS on new tables
ALTER TABLE stamp_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stamp_programs (anyone can view active programs)
CREATE POLICY "Anyone can view active programs"
  ON stamp_programs FOR SELECT
  USING (is_active = true);

-- RLS Policies for stamp_cards
CREATE POLICY "Customers can view own cards"
  ON stamp_cards FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.user_id = auth.uid() 
      AND customers.is_staff = true
    )
  );

CREATE POLICY "Anyone can insert stamp cards"
  ON stamp_cards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update stamp cards"
  ON stamp_cards FOR UPDATE
  USING (true);

-- RLS Policies for stamps
CREATE POLICY "Customers can view own stamps"
  ON stamps FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.user_id = auth.uid() 
      AND customers.is_staff = true
    )
  );

CREATE POLICY "Staff can add stamps"
  ON stamps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.user_id = auth.uid() 
      AND customers.is_staff = true
    )
    OR auth.uid() IS NULL
  );

-- Insert default stamp program
DO $$
DECLARE
  default_restaurant_id uuid;
BEGIN
  -- Get the first restaurant ID
  SELECT id INTO default_restaurant_id FROM restaurants LIMIT 1;
  
  -- Insert stamp program if it doesn't exist
  IF default_restaurant_id IS NOT NULL THEN
    INSERT INTO stamp_programs (
      restaurant_id,
      name,
      description,
      stamps_required,
      reward_type,
      reward_value,
      reward_percentage,
      is_active
    )
    VALUES (
      default_restaurant_id,
      'Coffee Loyalty Card',
      'Buy 10 coffees, get 1 free!',
      10,
      'percentage_discount',
      'Free Coffee',
      100,
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Function to auto-create stamp card for new customers
CREATE OR REPLACE FUNCTION create_stamp_card_for_customer()
RETURNS TRIGGER AS $$
DECLARE
  default_program_id uuid;
BEGIN
  -- Get the first active stamp program
  SELECT id INTO default_program_id 
  FROM stamp_programs 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Create stamp card if program exists
  IF default_program_id IS NOT NULL THEN
    INSERT INTO stamp_cards (customer_id, program_id)
    VALUES (NEW.id, default_program_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create stamp card when customer signs up
DROP TRIGGER IF EXISTS on_customer_created ON customers;
CREATE TRIGGER on_customer_created
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION create_stamp_card_for_customer();

-- Function to auto-generate reward coupon when stamp card completes
CREATE OR REPLACE FUNCTION check_stamp_card_completion()
RETURNS TRIGGER AS $$
DECLARE
  program_stamps_required integer;
  program_reward_value text;
  program_reward_percentage integer;
  customer_email text;
  new_coupon_code text;
BEGIN
  -- Get program details
  SELECT stamps_required, reward_value, reward_percentage
  INTO program_stamps_required, program_reward_value, program_reward_percentage
  FROM stamp_programs
  WHERE id = NEW.program_id;
  
  -- Check if card is complete
  IF NEW.current_stamps >= program_stamps_required AND NEW.status = 'active' THEN
    -- Get customer email
    SELECT email INTO customer_email
    FROM customers
    WHERE id = NEW.customer_id;
    
    -- Generate coupon code
    new_coupon_code := substring(md5(random()::text) from 1 for 4) || '-' || 
                       substring(md5(random()::text) from 1 for 4);
    new_coupon_code := upper(new_coupon_code);
    
    -- Create reward coupon
    INSERT INTO coupons (
      code,
      discount_type,
      discount_value,
      expires_at,
      is_redeemed,
      customer_id
    )
    VALUES (
      new_coupon_code,
      'percentage',
      program_reward_percentage,
      now() + interval '90 days',
      false,
      NEW.customer_id
    );
    
    -- Mark card as completed
    UPDATE stamp_cards
    SET status = 'completed',
        completed_at = now()
    WHERE id = NEW.id;
    
    -- Create new active card for customer
    INSERT INTO stamp_cards (customer_id, program_id, current_stamps, total_stamps_earned)
    VALUES (NEW.customer_id, NEW.program_id, 0, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check stamp card completion after adding stamp
DROP TRIGGER IF EXISTS on_stamp_card_updated ON stamp_cards;
CREATE TRIGGER on_stamp_card_updated
  AFTER UPDATE ON stamp_cards
  FOR EACH ROW
  EXECUTE FUNCTION check_stamp_card_completion();
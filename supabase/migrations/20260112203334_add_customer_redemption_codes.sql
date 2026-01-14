/*
  # Add Redemption Codes to Customers

  1. Changes
    - Add `redemption_code` column to `customers` table
      - Stores a unique 6-digit code for each customer
      - Used as an alternative to QR codes for stamp redemption
    - Add unique constraint to ensure no duplicate codes
    - Populate existing customers with random 6-digit codes

  2. Notes
    - Redemption codes are numeric 6-digit strings (e.g., "123456")
    - Restaurants can use either QR code scanning or manual code entry
    - Codes are unique across all customers for easy lookup
*/

-- Add redemption_code column to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'redemption_code'
  ) THEN
    ALTER TABLE customers ADD COLUMN redemption_code TEXT;
  END IF;
END $$;

-- Create unique index on redemption_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_redemption_code_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_customers_redemption_code_unique ON customers(redemption_code);
  END IF;
END $$;

-- Function to generate a random 6-digit code
CREATE OR REPLACE FUNCTION generate_redemption_code()
RETURNS TEXT AS $func$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-digit number
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM customers WHERE redemption_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$func$ LANGUAGE plpgsql;

-- Populate existing customers with unique redemption codes
DO $$
DECLARE
  customer_record RECORD;
BEGIN
  FOR customer_record IN SELECT id FROM customers WHERE redemption_code IS NULL
  LOOP
    UPDATE customers 
    SET redemption_code = generate_redemption_code() 
    WHERE id = customer_record.id;
  END LOOP;
END $$;

-- Add trigger to auto-generate redemption codes for new customers
CREATE OR REPLACE FUNCTION auto_generate_redemption_code()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.redemption_code IS NULL THEN
    NEW.redemption_code := generate_redemption_code();
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_redemption_code ON customers;

CREATE TRIGGER trigger_auto_generate_redemption_code
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_redemption_code();
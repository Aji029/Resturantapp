/*
  # Prevent Duplicate Stamp Cards
  
  1. Purpose
    - Add unique constraint to prevent duplicate active stamp cards per customer/program
    - This ensures each customer has only one active stamp card per program
  
  2. Changes
    - Add unique constraint on (customer_id, program_id, status) where status = 'active'
    - This prevents the bug where customers get multiple stamp cards
  
  3. Notes
    - Uses a partial unique index to only apply constraint when status is 'active'
    - Allows multiple 'completed' cards for history
*/

-- Create unique index to prevent duplicate active stamp cards
CREATE UNIQUE INDEX IF NOT EXISTS idx_stamp_cards_unique_active
ON stamp_cards (customer_id, program_id)
WHERE status = 'active';

-- Add comment
COMMENT ON INDEX idx_stamp_cards_unique_active IS 'Ensures each customer has only one active stamp card per program';

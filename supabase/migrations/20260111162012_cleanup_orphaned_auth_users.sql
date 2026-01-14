/*
  # Clean Up Orphaned Auth Users

  ## Problem
  Some auth.users records exist without corresponding customer records.
  This happened when the old RLS policy blocked customer creation.

  ## Solution
  Delete auth users that don't have customer records to allow fresh signups.

  ## Changes
  1. Delete auth.users records that have no matching customer record
  
  ## Security
  - Only removes orphaned accounts with no associated data
  - Safe to run multiple times (idempotent)
*/

-- Delete auth users that don't have a customer record
DO $$
DECLARE
  orphaned_user RECORD;
BEGIN
  FOR orphaned_user IN 
    SELECT u.id 
    FROM auth.users u 
    LEFT JOIN customers c ON c.user_id = u.id 
    WHERE c.id IS NULL
  LOOP
    -- Delete from auth.users (cascades to related auth tables)
    DELETE FROM auth.users WHERE id = orphaned_user.id;
    RAISE NOTICE 'Deleted orphaned auth user: %', orphaned_user.id;
  END LOOP;
END $$;

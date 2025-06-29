/*
  # Remove payment_status column from orders table

  1. Changes
    - Drop payment_status column from orders table
    - Drop payment_method column from orders table  
    - Drop payment_date column from orders table
    - Drop related triggers and functions
    - Clean up any constraints

  2. Security
    - No RLS changes needed as we're just removing columns
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_set_payment_date_mez ON orders;
DROP TRIGGER IF EXISTS trigger_set_payment_date_mez_insert ON orders;

-- Drop functions
DROP FUNCTION IF EXISTS set_payment_date_mez();
DROP FUNCTION IF EXISTS set_payment_date_mez_insert();

-- Drop payment-related columns
DO $$
BEGIN
  -- Drop payment_status column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders DROP COLUMN payment_status;
  END IF;

  -- Drop payment_method column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders DROP COLUMN payment_method;
  END IF;

  -- Drop payment_date column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE orders DROP COLUMN payment_date;
  END IF;
END $$;
/*
  # Add payment status column to orders table

  1. Changes
    - Add payment_status column with default 'unpaid'
    - Add payment_method column (optional)
    - Add payment_date column (optional)
    - Ensure all payment-related columns exist

  2. Security
    - No RLS changes needed as orders table already has proper policies
*/

-- Add payment_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));
  END IF;
END $$;

-- Add payment_method column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text CHECK (payment_method IN ('cash', 'card', 'digital', 'other'));
  END IF;
END $$;

-- Add payment_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_date timestamptz;
  END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN notes text;
  END IF;
END $$;

-- Update any existing orders to have default payment status
UPDATE orders SET payment_status = 'unpaid' WHERE payment_status IS NULL;
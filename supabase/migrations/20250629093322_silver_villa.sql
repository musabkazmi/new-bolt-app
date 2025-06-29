/*
  # Add Payment Tracking to Orders

  1. New Columns
    - Add `payment_status` to orders table (unpaid, paid, refunded)
    - Add `payment_method` to orders table (cash, card, digital)
    - Add `payment_date` to orders table
    - Add `notes` to orders table for additional information

  2. Security
    - Update existing RLS policies to accommodate new fields
    - Maintain existing security structure
*/

-- Add payment tracking columns to orders table
DO $$
BEGIN
  -- Add payment_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));
  END IF;

  -- Add payment_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text CHECK (payment_method IN ('cash', 'card', 'digital', 'other'));
  END IF;

  -- Add payment_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_date timestamptz;
  END IF;

  -- Add notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN notes text;
  END IF;
END $$;
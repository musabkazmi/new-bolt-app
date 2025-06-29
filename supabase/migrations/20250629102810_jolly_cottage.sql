/*
  # Add automatic payment_date with MEZ timezone

  1. Changes
    - Ensure payment_date column exists with proper timezone handling
    - Add trigger to automatically set payment_date when payment_status changes to 'paid'
    - Set timezone to Central European Time (MEZ/CET)

  2. Features
    - Automatic timestamp insertion when order is marked as paid
    - Uses Central European Time zone (Europe/Berlin)
    - Preserves existing payment_date values if already set
*/

-- Ensure payment_date column exists (should already exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_date timestamptz;
  END IF;
END $$;

-- Create function to automatically set payment_date in MEZ timezone
CREATE OR REPLACE FUNCTION set_payment_date_mez()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set payment_date if payment_status changed to 'paid' and payment_date is not already set
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Set payment_date to current time in Central European Time (MEZ/CET)
    NEW.payment_date = NOW() AT TIME ZONE 'Europe/Berlin';
  END IF;
  
  -- If payment_status changes from 'paid' to something else, clear payment_date
  IF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
    NEW.payment_date = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_set_payment_date_mez ON orders;

-- Create trigger that fires before update on orders table
CREATE TRIGGER trigger_set_payment_date_mez
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_date_mez();

-- Also create trigger for INSERT operations (when creating paid orders directly)
CREATE OR REPLACE FUNCTION set_payment_date_mez_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Set payment_date if payment_status is 'paid' and payment_date is not already set
  IF NEW.payment_status = 'paid' AND NEW.payment_date IS NULL THEN
    NEW.payment_date = NOW() AT TIME ZONE 'Europe/Berlin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop insert trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_set_payment_date_mez_insert ON orders;

-- Create trigger that fires before insert on orders table
CREATE TRIGGER trigger_set_payment_date_mez_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_date_mez_insert();

-- Update any existing paid orders that don't have payment_date set
UPDATE orders 
SET payment_date = NOW() AT TIME ZONE 'Europe/Berlin'
WHERE payment_status = 'paid' AND payment_date IS NULL;
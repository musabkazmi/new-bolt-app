/*
  # Make customer name optional in orders

  1. Changes
    - Remove NOT NULL constraint from customer_name column in orders table
    - Allow customer_name to be null for anonymous orders
    - Update existing orders with empty customer names to null for consistency

  2. Security
    - No changes to RLS policies needed
    - Maintains existing access controls
*/

-- Remove NOT NULL constraint from customer_name
ALTER TABLE orders ALTER COLUMN customer_name DROP NOT NULL;

-- Update existing empty customer names to null for consistency
UPDATE orders SET customer_name = NULL WHERE customer_name = '' OR customer_name IS NULL;
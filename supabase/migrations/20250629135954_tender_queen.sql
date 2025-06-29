/*
  # Add Bar Staff Role

  1. Changes
    - Update users table role constraint to include 'bar' role
    - Add bar role to existing check constraint
    - Update RLS policies to include bar staff permissions

  2. Security
    - Bar staff can read all orders (to see drink orders)
    - Bar staff can update order items (to mark drinks as ready)
    - Maintain existing security structure
*/

-- Update the role constraint to include 'bar'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('manager', 'waiter', 'kitchen', 'customer', 'bar'));

-- Update orders policies to include bar staff
DROP POLICY IF EXISTS "Users can read relevant orders" ON orders;
CREATE POLICY "Users can read relevant orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    waiter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'kitchen', 'bar')
    )
  );

DROP POLICY IF EXISTS "Staff can update orders" ON orders;
CREATE POLICY "Staff can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    waiter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'kitchen', 'bar')
    )
  );

-- Update order items policies to include bar staff
DROP POLICY IF EXISTS "Users can read relevant order items" ON order_items;
CREATE POLICY "Users can read relevant order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        orders.customer_id = auth.uid() OR
        orders.waiter_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role IN ('manager', 'kitchen', 'bar')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Staff can manage order items" ON order_items;
CREATE POLICY "Staff can manage order items"
  ON order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        orders.waiter_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role IN ('manager', 'kitchen', 'bar')
        )
      )
    )
  );
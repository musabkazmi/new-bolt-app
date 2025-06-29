/*
  # Restaurant Management Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `role` (text) - manager, waiter, kitchen, customer
      - `name` (text)
      - `created_at` (timestamp)
    
    - `menu_items`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (decimal)
      - `category` (text)
      - `image_url` (text, optional)
      - `available` (boolean)
      - `created_at` (timestamp)
    
    - `orders`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references users)
      - `waiter_id` (uuid, references users, optional)
      - `table_number` (integer, optional)
      - `customer_name` (text)
      - `status` (text) - pending, preparing, ready, served, completed
      - `total` (decimal)
      - `created_at` (timestamp)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `menu_item_id` (uuid, references menu_items)
      - `quantity` (integer)
      - `price` (decimal)
      - `notes` (text, optional)
      - `status` (text) - pending, preparing, ready
    
    - `messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `content` (text)
      - `type` (text) - user, assistant
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'waiter', 'kitchen', 'customer')),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL,
  category text NOT NULL,
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id),
  waiter_id uuid REFERENCES users(id),
  table_number integer,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'completed')),
  total decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  quantity integer NOT NULL DEFAULT 1,
  price decimal(10,2) NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready')),
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('user', 'assistant')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Menu items policies (everyone can read, only managers can modify)
CREATE POLICY "Anyone can read menu items"
  ON menu_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage menu items"
  ON menu_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'manager'
    )
  );

-- Orders policies
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
      AND users.role IN ('manager', 'kitchen')
    )
  );

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid() OR
    waiter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'waiter')
    )
  );

CREATE POLICY "Staff can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    waiter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'kitchen')
    )
  );

-- Order items policies
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
          AND users.role IN ('manager', 'kitchen')
        )
      )
    )
  );

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
          AND users.role IN ('manager', 'kitchen')
        )
      )
    )
  );

-- Messages policies
CREATE POLICY "Users can read own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, available) VALUES
  ('Margherita Pizza', 'Fresh tomatoes, mozzarella cheese, basil, olive oil', 18.99, 'Main Course', true),
  ('Caesar Salad', 'Romaine lettuce, parmesan, croutons, caesar dressing', 12.99, 'Salads', true),
  ('Grilled Salmon', 'Atlantic salmon with lemon butter sauce and vegetables', 24.99, 'Main Course', true),
  ('Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 8.99, 'Desserts', true),
  ('House Wine', 'Red or white wine selection', 8.99, 'Beverages', true),
  ('Chicken Alfredo', 'Grilled chicken with creamy alfredo sauce over fettuccine', 19.99, 'Main Course', true),
  ('Greek Salad', 'Mixed greens, olives, feta cheese, tomatoes, cucumber', 11.99, 'Salads', true),
  ('Tiramisu', 'Classic Italian dessert with coffee and mascarpone', 7.99, 'Desserts', true);
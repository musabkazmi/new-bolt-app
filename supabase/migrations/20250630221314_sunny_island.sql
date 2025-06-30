/*
  # Add inventory management and menu item dependencies

  1. New Tables
    - `inventory_items` - Tracks bar inventory with quantities and thresholds
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `category` (text, not null)
      - `quantity` (numeric, not null)
      - `unit` (text, not null)
      - `threshold` (numeric, not null)
      - `last_updated` (timestamptz)
      - `notes` (text)
  
  2. Changes
    - Add `required_inventory` column to `menu_items` table
    - Create trigger to update menu item availability based on inventory
  
  3. Security
    - Enable RLS on inventory_items table
    - Add policies for bar staff and managers
*/

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL,
  threshold numeric(10,2) NOT NULL DEFAULT 5,
  last_updated timestamptz DEFAULT now(),
  notes text
);

-- Add required_inventory column to menu_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'required_inventory'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN required_inventory text[];
  END IF;
END $$;

-- Enable RLS on inventory_items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_items (only if they don't exist)
DO $$
BEGIN
  -- Check if read policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_items' AND policyname = 'Bar staff and managers can read inventory'
  ) THEN
    CREATE POLICY "Bar staff and managers can read inventory"
      ON inventory_items
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('bar', 'manager')
        )
      );
  END IF;

  -- Check if update policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_items' AND policyname = 'Bar staff and managers can update inventory'
  ) THEN
    CREATE POLICY "Bar staff and managers can update inventory"
      ON inventory_items
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('bar', 'manager')
        )
      );
  END IF;

  -- Check if insert policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_items' AND policyname = 'Bar staff and managers can insert inventory'
  ) THEN
    CREATE POLICY "Bar staff and managers can insert inventory"
      ON inventory_items
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('bar', 'manager')
        )
      );
  END IF;

  -- Check if delete policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_items' AND policyname = 'Bar staff and managers can delete inventory'
  ) THEN
    CREATE POLICY "Bar staff and managers can delete inventory"
      ON inventory_items
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('bar', 'manager')
        )
      );
  END IF;
END $$;

-- Insert initial inventory items (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inventory_items LIMIT 1) THEN
    INSERT INTO inventory_items (name, category, quantity, unit, threshold, notes)
    VALUES
      ('Vodka', 'Alcohol', 12, 'bottles', 5, 'Standard 750ml bottles'),
      ('Rum', 'Alcohol', 8, 'bottles', 5, 'White and dark rum'),
      ('Gin', 'Alcohol', 4, 'bottles', 5, 'Premium London dry gin'),
      ('Tequila', 'Alcohol', 2, 'bottles', 5, 'Silver tequila'),
      ('Coffee Beans', 'Coffee', 8, 'kg', 3, 'Arabica beans'),
      ('Milk', 'Dairy', 15, 'liters', 10, 'Whole milk'),
      ('Lemons', 'Fruit', 25, 'pieces', 15, 'For garnish and cocktails'),
      ('Limes', 'Fruit', 12, 'pieces', 15, 'For garnish and cocktails'),
      ('Simple Syrup', 'Syrups', 3, 'bottles', 2, '500ml bottles'),
      ('Mint', 'Herbs', 5, 'bunches', 3, 'For mojitos and garnish'),
      ('Tonic Water', 'Mixers', 24, 'bottles', 12, '200ml bottles'),
      ('Soda Water', 'Mixers', 18, 'bottles', 12, '200ml bottles'),
      ('Orange Juice', 'Juices', 8, 'liters', 5, 'Fresh squeezed'),
      ('Cranberry Juice', 'Juices', 3, 'liters', 5, ''),
      ('Ice', 'Essentials', 25, 'kg', 10, 'Cubed ice');
  END IF;
END $$;

-- Update menu items with required inventory (only if not already set)
UPDATE menu_items
SET required_inventory = CASE
  WHEN name = 'Iced Coffee' THEN ARRAY['Coffee Beans', 'Milk', 'Ice']::text[]
  WHEN name = 'Iced Latte' THEN ARRAY['Coffee Beans', 'Milk', 'Ice']::text[]
  WHEN name = 'Lemon Iced Tea' THEN ARRAY['Lemons', 'Ice']::text[]
  WHEN name = 'Sparkling Water' THEN ARRAY['Soda Water', 'Lemons', 'Limes']::text[]
  WHEN name = 'Coca-Cola' THEN ARRAY['Ice', 'Lemons']::text[]
  WHEN name = 'Fresh Orange Juice' THEN ARRAY['Orange Juice', 'Ice']::text[]
  WHEN name = 'Mojito (Non-Alcoholic)' THEN ARRAY['Mint', 'Limes', 'Soda Water', 'Ice']::text[]
  WHEN name = 'Lemonade' THEN ARRAY['Lemons', 'Simple Syrup', 'Ice']::text[]
  WHEN name = 'Iced Chocolate' THEN ARRAY['Milk', 'Ice']::text[]
  WHEN name = 'Mango Smoothie' THEN ARRAY['Milk', 'Ice']::text[]
  WHEN name = 'House Wine' THEN ARRAY[]::text[]
  ELSE required_inventory
END
WHERE category IN ('Beverage', 'Drink', 'Alcohol', 'Coffee', 'Tea', 'Wine', 'Beer', 'Cocktail')
  AND required_inventory IS NULL;

-- Create or replace function to update menu item availability based on inventory
CREATE OR REPLACE FUNCTION update_menu_item_availability()
RETURNS TRIGGER AS $$
DECLARE
  menu_item_record RECORD;
  inventory_item_name TEXT;
  all_ingredients_available BOOLEAN;
BEGIN
  -- For all menu items that require the updated inventory item
  FOR menu_item_record IN 
    SELECT id, name, required_inventory 
    FROM menu_items 
    WHERE required_inventory @> ARRAY[NEW.name]
  LOOP
    -- Check if all required inventory items are available
    all_ingredients_available := TRUE;
    
    FOREACH inventory_item_name IN ARRAY menu_item_record.required_inventory
    LOOP
      IF EXISTS (
        SELECT 1 FROM inventory_items 
        WHERE name = inventory_item_name AND quantity <= 0
      ) THEN
        all_ingredients_available := FALSE;
        EXIT; -- Exit loop early if any ingredient is unavailable
      END IF;
    END LOOP;
    
    -- Update menu item availability
    UPDATE menu_items 
    SET available = all_ingredients_available
    WHERE id = menu_item_record.id;
    
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update menu item availability when inventory changes
DROP TRIGGER IF EXISTS trigger_update_menu_item_availability ON inventory_items;
CREATE TRIGGER trigger_update_menu_item_availability
AFTER UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION update_menu_item_availability();
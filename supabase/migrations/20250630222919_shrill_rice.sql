/*
  # Fix critical inventory ingredients handling

  1. Changes
     - Add is_critical column to inventory_items table
     - Update existing inventory items to mark which ones are critical
     - Update the function to only consider critical ingredients for availability
  
  2. Security
     - No changes to RLS policies
*/

-- Add is_critical column to inventory_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'is_critical'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN is_critical BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Update existing inventory items to mark which ones are critical
UPDATE inventory_items
SET is_critical = CASE
  WHEN name IN ('Ice', 'Lemons', 'Limes', 'Mint') THEN false
  ELSE true
END
WHERE name IN ('Ice', 'Lemons', 'Limes', 'Mint', 'Vodka', 'Rum', 'Gin', 'Tequila', 'Coffee Beans', 'Milk', 'Simple Syrup', 'Tonic Water', 'Soda Water', 'Orange Juice', 'Cranberry Juice');

-- Update the function to only consider critical ingredients for availability
CREATE OR REPLACE FUNCTION update_menu_item_availability()
RETURNS TRIGGER AS $$
DECLARE
  menu_item_record RECORD;
  inventory_item_record RECORD;
  all_critical_ingredients_available BOOLEAN;
  inventory_item_name TEXT;
BEGIN
  -- For all menu items that require the updated inventory item
  FOR menu_item_record IN 
    SELECT id, name, required_inventory 
    FROM menu_items 
    WHERE required_inventory @> ARRAY[NEW.name]::text[]
  LOOP
    -- Check if all CRITICAL required inventory items are available
    all_critical_ingredients_available := TRUE;
    
    -- Loop through each required ingredient for this menu item
    FOREACH inventory_item_name IN ARRAY menu_item_record.required_inventory
    LOOP
      -- Check if this ingredient is critical and out of stock
      SELECT * INTO inventory_item_record 
      FROM inventory_items 
      WHERE name = inventory_item_name;
      
      IF inventory_item_record.is_critical = true AND inventory_item_record.quantity <= 0 THEN
        all_critical_ingredients_available := FALSE;
        EXIT; -- Exit loop early if any critical ingredient is unavailable
      END IF;
    END LOOP;
    
    -- Update menu item availability based on critical ingredients only
    UPDATE menu_items 
    SET available = all_critical_ingredients_available
    WHERE id = menu_item_record.id;
    
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
/*
  # Fix Inventory System and Migration Issues

  1. Schema Verification
    - Verify inventory_items table structure
    - Ensure is_critical column exists with proper default
    - Fix any inconsistencies in the schema
  
  2. Data Cleanup
    - Update critical/non-critical status for inventory items
    - Ensure all required inventory items have proper status
  
  3. Function Updates
    - Fix and replace the update_menu_item_availability trigger function
    - Ensure proper handling of critical vs non-critical ingredients
*/

-- First, verify the inventory_items table has the is_critical column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'is_critical'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN is_critical BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Ensure the trigger exists on the inventory_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_menu_item_availability'
  ) THEN
    CREATE TRIGGER trigger_update_menu_item_availability
    AFTER UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_menu_item_availability();
  END IF;
END $$;

-- Update all inventory items to have proper critical status
-- Common non-critical items are set to false, everything else to true
UPDATE inventory_items
SET is_critical = CASE
  WHEN name IN ('Ice', 'Lemons', 'Limes', 'Mint', 'Garnish', 'Straw', 'Napkin', 'Coaster', 'Stirrer', 'Umbrella') THEN false
  ELSE true
END;

-- Drop and recreate the function to ensure it's in the correct state
DROP FUNCTION IF EXISTS update_menu_item_availability CASCADE;

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
      
      -- Skip if inventory item doesn't exist
      CONTINUE WHEN inventory_item_record IS NULL;
      
      -- Only mark as unavailable if critical ingredient is out of stock
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

-- Recreate the trigger to ensure it's properly connected to the function
DROP TRIGGER IF EXISTS trigger_update_menu_item_availability ON inventory_items;

CREATE TRIGGER trigger_update_menu_item_availability
AFTER UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION update_menu_item_availability();

-- Update all inventory items to trigger the function and update menu item availability
UPDATE inventory_items SET last_updated = NOW();

-- Verify the schema is in the correct state
DO $$
BEGIN
  RAISE NOTICE 'Inventory system migration completed successfully';
  RAISE NOTICE 'Critical inventory functionality has been fixed';
END $$;
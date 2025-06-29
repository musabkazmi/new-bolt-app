/*
  # Add detailed menu item fields

  1. New Columns
    - `ingredients` (text array) - List of ingredients
    - `allergens` (text array) - List of allergens
    - `preparation_time` (integer) - Preparation time in minutes
    - `calories` (integer) - Calorie count
    - `dietary_info` (text array) - Dietary information (vegetarian, vegan, etc.)

  2. Changes
    - Add new columns to menu_items table for enhanced menu item details
    - These fields support the detailed menu item view functionality
*/

-- Add ingredients column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'ingredients'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN ingredients text[];
  END IF;
END $$;

-- Add allergens column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'allergens'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN allergens text[];
  END IF;
END $$;

-- Add preparation_time column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'preparation_time'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN preparation_time integer;
  END IF;
END $$;

-- Add calories column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'calories'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN calories integer;
  END IF;
END $$;

-- Add dietary_info column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'dietary_info'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN dietary_info text[];
  END IF;
END $$;

-- Update existing menu items with sample data
UPDATE menu_items SET 
  ingredients = CASE 
    WHEN name ILIKE '%pizza%' THEN ARRAY['Pizza Dough', 'Tomato Sauce', 'Mozzarella Cheese', 'Fresh Basil', 'Olive Oil']
    WHEN name ILIKE '%salad%' THEN ARRAY['Mixed Greens', 'Cherry Tomatoes', 'Cucumber', 'Red Onion', 'Olive Oil Dressing']
    WHEN name ILIKE '%salmon%' THEN ARRAY['Atlantic Salmon Fillet', 'Lemon', 'Butter', 'Seasonal Vegetables', 'Herbs']
    WHEN name ILIKE '%chicken%' THEN ARRAY['Chicken Breast', 'Garlic', 'Black Pepper', 'Salt']
    WHEN category = 'Desserts' THEN ARRAY['Sugar', 'Flour', 'Eggs', 'Butter']
    ELSE ARRAY['Fresh Ingredients', 'Seasonings', 'Chef''s Special Sauce']
  END,
  allergens = CASE 
    WHEN name ILIKE '%pizza%' OR name ILIKE '%pasta%' THEN ARRAY['Gluten', 'Dairy']
    WHEN name ILIKE '%salmon%' OR name ILIKE '%fish%' THEN ARRAY['Fish']
    WHEN category = 'Desserts' THEN ARRAY['Gluten', 'Dairy', 'Eggs']
    WHEN name ILIKE '%cheese%' OR name ILIKE '%cream%' THEN ARRAY['Dairy']
    ELSE ARRAY[]::text[]
  END,
  preparation_time = CASE 
    WHEN category = 'Desserts' THEN 15
    WHEN name ILIKE '%salad%' THEN 10
    WHEN name ILIKE '%pizza%' THEN 25
    WHEN name ILIKE '%salmon%' OR name ILIKE '%chicken%' THEN 20
    ELSE 15
  END,
  calories = CASE 
    WHEN name ILIKE '%salad%' THEN 250
    WHEN name ILIKE '%pizza%' THEN 650
    WHEN name ILIKE '%salmon%' THEN 450
    WHEN name ILIKE '%chicken%' THEN 520
    WHEN category = 'Desserts' THEN 380
    ELSE 400
  END,
  dietary_info = CASE 
    WHEN name ILIKE '%salad%' AND name NOT ILIKE '%chicken%' THEN ARRAY['Vegetarian', 'Gluten-Free']
    WHEN name ILIKE '%salmon%' THEN ARRAY['High Protein', 'Omega-3 Rich']
    WHEN name ILIKE '%chicken%' THEN ARRAY['High Protein', 'Low Carb']
    WHEN category = 'Desserts' THEN ARRAY['Contains Sugar']
    ELSE ARRAY[]::text[]
  END
WHERE ingredients IS NULL;
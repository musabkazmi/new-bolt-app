/*
  # Add cold beverages to menu

  1. New Items
    - Adds several cold beverages to the menu_items table
    - Each item has name, description, price, and category
    - All items are set to available by default
  
  2. Categories
    - All items are categorized as "Beverage" or "Drink"
    - Ensures proper filtering in the bar dashboard
*/

-- Check if beverages already exist to prevent duplication
DO $$
DECLARE
  beverage_count integer;
BEGIN
  SELECT COUNT(*) INTO beverage_count FROM menu_items 
  WHERE name IN ('Iced Coffee', 'Iced Latte', 'Lemon Iced Tea', 'Sparkling Water', 
                'Coca-Cola', 'Fresh Orange Juice', 'Mojito (Non-Alcoholic)', 'Lemonade');
  
  -- Only insert if beverages don't already exist
  IF beverage_count = 0 THEN
    INSERT INTO menu_items (name, description, price, category, available, ingredients, allergens, dietary_info)
    VALUES
      ('Iced Coffee', 'Chilled coffee served over ice with a touch of cream', 3.99, 'Beverage', true, 
       ARRAY['Coffee', 'Ice', 'Cream']::text[], ARRAY['Dairy']::text[], ARRAY['Caffeine']::text[]),
      
      ('Iced Latte', 'Espresso mixed with cold milk and served over ice', 4.50, 'Beverage', true,
       ARRAY['Espresso', 'Milk', 'Ice']::text[], ARRAY['Dairy']::text[], ARRAY['Caffeine']::text[]),
      
      ('Lemon Iced Tea', 'Refreshing black tea with lemon, served chilled', 3.50, 'Beverage', true,
       ARRAY['Black Tea', 'Lemon', 'Ice', 'Sugar']::text[], ARRAY[]::text[], ARRAY['Caffeine']::text[]),
      
      ('Sparkling Water', 'Refreshing carbonated water with a hint of lime', 2.50, 'Beverage', true,
       ARRAY['Carbonated Water', 'Lime']::text[], ARRAY[]::text[], ARRAY['Vegan', 'Gluten-Free']::text[]),
      
      ('Coca-Cola', 'Classic cola served with ice and a slice of lemon', 2.99, 'Beverage', true,
       ARRAY['Cola', 'Ice', 'Lemon']::text[], ARRAY[]::text[], ARRAY['Caffeine']::text[]),
      
      ('Fresh Orange Juice', 'Freshly squeezed orange juice', 4.99, 'Drink', true,
       ARRAY['Oranges']::text[], ARRAY[]::text[], ARRAY['Vegan', 'Gluten-Free', 'Vitamin C']::text[]),
      
      ('Mojito (Non-Alcoholic)', 'Refreshing mint, lime, and soda mocktail', 5.50, 'Drink', true,
       ARRAY['Mint', 'Lime', 'Sugar', 'Soda Water']::text[], ARRAY[]::text[], ARRAY['Vegan', 'Gluten-Free']::text[]),
      
      ('Lemonade', 'Homemade lemonade with fresh lemons and mint', 3.99, 'Drink', true,
       ARRAY['Lemons', 'Sugar', 'Mint', 'Water']::text[], ARRAY[]::text[], ARRAY['Vegan', 'Gluten-Free']::text[]);
  END IF;
END $$;
/*
  # Add Cold Beverages to Menu

  1. New Items
    - Add 10 cold beverages to the menu_items table
    - Include detailed descriptions, prices, and categorization
    - Add ingredient lists, allergen information, and dietary details
    - Ensure all beverages are properly categorized for Bar Dashboard

  2. Features
    - All beverages categorized as "Beverage" for proper filtering
    - Complete with preparation times and calorie information
    - Properly formatted arrays with explicit type casting for empty arrays
*/

-- Insert cold beverages
INSERT INTO menu_items (name, description, price, category, available, ingredients, allergens, preparation_time, calories, dietary_info)
VALUES
  ('Iced Coffee', 'Chilled coffee served over ice cubes with a splash of milk and optional sugar syrup', 4.50, 'Beverage', true, 
   ARRAY['Coffee', 'Ice', 'Milk', 'Sugar Syrup'], 
   ARRAY['Dairy'], 
   3, 120, 
   ARRAY['Caffeine']),
   
  ('Iced Latte', 'Espresso mixed with cold milk and poured over ice for a refreshing coffee experience', 5.50, 'Beverage', true, 
   ARRAY['Espresso', 'Cold Milk', 'Ice'], 
   ARRAY['Dairy'], 
   4, 150, 
   ARRAY['Caffeine']),
   
  ('Lemon Iced Tea', 'Freshly brewed black tea chilled with ice, lemon slices and a hint of mint', 4.99, 'Beverage', true, 
   ARRAY['Black Tea', 'Lemon', 'Ice', 'Mint', 'Sugar'], 
   ARRAY[]::text[], 
   3, 90, 
   ARRAY['Caffeine', 'Vegan']),
   
  ('Sparkling Water', 'Refreshing carbonated mineral water served with a slice of lemon or lime', 3.50, 'Beverage', true, 
   ARRAY['Carbonated Water', 'Lemon/Lime Slice'], 
   ARRAY[]::text[], 
   1, 0, 
   ARRAY['Vegan', 'Sugar-Free', 'Calorie-Free']),
   
  ('Coca-Cola', 'Classic cola served chilled with ice and a slice of lemon', 3.99, 'Beverage', true, 
   ARRAY['Coca-Cola', 'Ice', 'Lemon Slice'], 
   ARRAY[]::text[], 
   1, 140, 
   ARRAY[]::text[]),
   
  ('Fresh Orange Juice', 'Freshly squeezed orange juice served chilled with optional ice', 5.99, 'Beverage', true, 
   ARRAY['Oranges', 'Ice (optional)'], 
   ARRAY[]::text[], 
   5, 120, 
   ARRAY['Vegan', 'No Added Sugar', 'Vitamin C']),
   
  ('Mojito (Non-Alcoholic)', 'Refreshing mix of lime, mint, sugar, and soda water - alcohol-free', 6.99, 'Beverage', true, 
   ARRAY['Lime', 'Mint Leaves', 'Sugar', 'Soda Water', 'Ice'], 
   ARRAY[]::text[], 
   6, 110, 
   ARRAY['Vegan', 'Alcohol-Free']),
   
  ('Lemonade', 'Homemade lemonade with fresh lemons, sugar, and mint', 4.99, 'Beverage', true, 
   ARRAY['Lemons', 'Sugar', 'Water', 'Mint', 'Ice'], 
   ARRAY[]::text[], 
   4, 130, 
   ARRAY['Vegan']),
   
  ('Iced Chocolate', 'Rich chocolate milk served over ice with whipped cream and chocolate shavings', 5.99, 'Beverage', true, 
   ARRAY['Chocolate Milk', 'Ice', 'Whipped Cream', 'Chocolate Shavings'], 
   ARRAY['Dairy'], 
   4, 280, 
   ARRAY[]::text[]),
   
  ('Mango Smoothie', 'Creamy smoothie with fresh mango, yogurt, and a hint of honey', 7.99, 'Beverage', true, 
   ARRAY['Mango', 'Yogurt', 'Honey', 'Ice'], 
   ARRAY['Dairy'], 
   5, 220, 
   ARRAY['Vegetarian', 'High in Vitamin C']);
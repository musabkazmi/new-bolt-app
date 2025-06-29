/*
  # Add cold beverages to menu

  1. New Items
    - Adds various cold beverages to the menu including:
      - Iced Coffee
      - Iced Latte
      - Lemon Iced Tea
      - Sparkling Water
      - Coca-Cola
      - Fresh Orange Juice
      - Non-Alcoholic Mojito
      - Lemonade
      - Iced Chocolate
      - Mango Smoothie
    - All items are categorized as 'Beverage'
    - Includes detailed information about ingredients, allergens, etc.
*/

-- Insert cold beverages
INSERT INTO menu_items (name, description, price, category, available, ingredients, allergens, preparation_time, calories, dietary_info)
VALUES
  ('Iced Coffee', 'Chilled coffee served over ice cubes with a splash of milk and optional sugar syrup', 4.50, 'Beverage', true, 
   ARRAY['Coffee', 'Ice', 'Milk', 'Sugar Syrup']::text[], 
   ARRAY['Dairy']::text[], 
   3, 120, 
   ARRAY['Caffeine']::text[]),
   
  ('Iced Latte', 'Espresso mixed with cold milk and poured over ice for a refreshing coffee experience', 5.50, 'Beverage', true, 
   ARRAY['Espresso', 'Cold Milk', 'Ice']::text[], 
   ARRAY['Dairy']::text[], 
   4, 150, 
   ARRAY['Caffeine']::text[]),
   
  ('Lemon Iced Tea', 'Freshly brewed black tea chilled with ice, lemon slices and a hint of mint', 4.99, 'Beverage', true, 
   ARRAY['Black Tea', 'Lemon', 'Ice', 'Mint', 'Sugar']::text[], 
   ARRAY[]::text[], 
   3, 90, 
   ARRAY['Caffeine', 'Vegan']::text[]),
   
  ('Sparkling Water', 'Refreshing carbonated mineral water served with a slice of lemon or lime', 3.50, 'Beverage', true, 
   ARRAY['Carbonated Water', 'Lemon/Lime Slice']::text[], 
   ARRAY[]::text[], 
   1, 0, 
   ARRAY['Vegan', 'Sugar-Free', 'Calorie-Free']::text[]),
   
  ('Coca-Cola', 'Classic cola served chilled with ice and a slice of lemon', 3.99, 'Beverage', true, 
   ARRAY['Coca-Cola', 'Ice', 'Lemon Slice']::text[], 
   ARRAY[]::text[], 
   1, 140, 
   ARRAY[]::text[]),
   
  ('Fresh Orange Juice', 'Freshly squeezed orange juice served chilled with optional ice', 5.99, 'Beverage', true, 
   ARRAY['Oranges', 'Ice (optional)']::text[], 
   ARRAY[]::text[], 
   5, 120, 
   ARRAY['Vegan', 'No Added Sugar', 'Vitamin C']::text[]),
   
  ('Mojito (Non-Alcoholic)', 'Refreshing mix of lime, mint, sugar, and soda water - alcohol-free', 6.99, 'Beverage', true, 
   ARRAY['Lime', 'Mint Leaves', 'Sugar', 'Soda Water', 'Ice']::text[], 
   ARRAY[]::text[], 
   6, 110, 
   ARRAY['Vegan', 'Alcohol-Free']::text[]),
   
  ('Lemonade', 'Homemade lemonade with fresh lemons, sugar, and mint', 4.99, 'Beverage', true, 
   ARRAY['Lemons', 'Sugar', 'Water', 'Mint', 'Ice']::text[], 
   ARRAY[]::text[], 
   4, 130, 
   ARRAY['Vegan']::text[]),
   
  ('Iced Chocolate', 'Rich chocolate milk served over ice with whipped cream and chocolate shavings', 5.99, 'Beverage', true, 
   ARRAY['Chocolate Milk', 'Ice', 'Whipped Cream', 'Chocolate Shavings']::text[], 
   ARRAY['Dairy']::text[], 
   4, 280, 
   ARRAY[]::text[]),
   
  ('Mango Smoothie', 'Creamy smoothie with fresh mango, yogurt, and a hint of honey', 7.99, 'Beverage', true, 
   ARRAY['Mango', 'Yogurt', 'Honey', 'Ice']::text[], 
   ARRAY['Dairy']::text[], 
   5, 220, 
   ARRAY['Vegetarian', 'High in Vitamin C']::text[]);
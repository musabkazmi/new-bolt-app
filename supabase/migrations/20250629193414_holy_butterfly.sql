/*
  # Add Cold Beverages to Menu

  1. New Items
    - Add a selection of cold beverages to the menu_items table
    - Include various non-alcoholic and refreshing drinks
    - Set appropriate prices, descriptions, and categorize as 'Beverage' or 'Drink'
    - Ensure all items are available by default

  2. Details
    - Each beverage has a detailed description
    - Prices range from €3.50 to €7.99
    - All items are properly categorized for the Bar Dashboard
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
   ARRAY[], 
   3, 90, 
   ARRAY['Caffeine', 'Vegan']),
   
  ('Sparkling Water', 'Refreshing carbonated mineral water served with a slice of lemon or lime', 3.50, 'Beverage', true, 
   ARRAY['Carbonated Water', 'Lemon/Lime Slice'], 
   ARRAY[], 
   1, 0, 
   ARRAY['Vegan', 'Sugar-Free', 'Calorie-Free']),
   
  ('Coca-Cola', 'Classic cola served chilled with ice and a slice of lemon', 3.99, 'Beverage', true, 
   ARRAY['Coca-Cola', 'Ice', 'Lemon Slice'], 
   ARRAY[], 
   1, 140, 
   ARRAY[]),
   
  ('Fresh Orange Juice', 'Freshly squeezed orange juice served chilled with optional ice', 5.99, 'Beverage', true, 
   ARRAY['Oranges', 'Ice (optional)'], 
   ARRAY[], 
   5, 120, 
   ARRAY['Vegan', 'No Added Sugar', 'Vitamin C']),
   
  ('Mojito (Non-Alcoholic)', 'Refreshing mix of lime, mint, sugar, and soda water - alcohol-free', 6.99, 'Beverage', true, 
   ARRAY['Lime', 'Mint Leaves', 'Sugar', 'Soda Water', 'Ice'], 
   ARRAY[], 
   6, 110, 
   ARRAY['Vegan', 'Alcohol-Free']),
   
  ('Lemonade', 'Homemade lemonade with fresh lemons, sugar, and mint', 4.99, 'Beverage', true, 
   ARRAY['Lemons', 'Sugar', 'Water', 'Mint', 'Ice'], 
   ARRAY[], 
   4, 130, 
   ARRAY['Vegan']),
   
  ('Iced Chocolate', 'Rich chocolate milk served over ice with whipped cream and chocolate shavings', 5.99, 'Beverage', true, 
   ARRAY['Chocolate Milk', 'Ice', 'Whipped Cream', 'Chocolate Shavings'], 
   ARRAY['Dairy'], 
   4, 280, 
   ARRAY[]),
   
  ('Mango Smoothie', 'Creamy smoothie with fresh mango, yogurt, and a hint of honey', 7.99, 'Beverage', true, 
   ARRAY['Mango', 'Yogurt', 'Honey', 'Ice'], 
   ARRAY['Dairy'], 
   5, 220, 
   ARRAY['Vegetarian', 'High in Vitamin C']);
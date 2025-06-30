import React, { useState, useEffect } from 'react';
import { Wine, Search, Filter, RefreshCw, AlertCircle, Tag, DollarSign, Info } from 'lucide-react';
import { supabase, MenuItem, InventoryItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function BarMenuPage() {
  const [beverages, setBeverages] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      loadBeverages();
      loadInventory();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    filterBeverages();
  }, [beverages, searchTerm, selectedCategory]);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*');
        
      if (error) {
        console.error('Error loading inventory:', error);
        return;
      }
      
      setInventoryItems(data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  };

  const loadBeverages = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching beverages from Supabase...');
      
      const { data, error: fetchError } = await supabase
        .from('menu_items')
        .select('*')
        .or('category.ilike.%Beverage%,category.ilike.%Drink%,category.ilike.%Coffee%,category.ilike.%Tea%,category.ilike.%Alcohol%,category.ilike.%Wine%,category.ilike.%Beer%,category.ilike.%Cocktail%')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setError(`Failed to load beverages: ${fetchError.message}`);
        return;
      }

      console.log('Beverages fetched:', data?.length || 0);

      if (!data || data.length === 0) {
        setError('No beverages found in the database');
        setBeverages([]);
        return;
      }

      // Check inventory availability for each beverage
      const beveragesWithAvailability = await checkBeverageAvailability(data);
      setBeverages(beveragesWithAvailability);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      setCategories(uniqueCategories);
      
      console.log('Categories found:', uniqueCategories);
      
    } catch (err) {
      console.error('Error loading beverages:', err);
      setError('An unexpected error occurred while loading the beverages');
    } finally {
      setLoading(false);
    }
  };

  const checkBeverageAvailability = async (beverages: MenuItem[]): Promise<MenuItem[]> => {
    try {
      // Get all inventory items
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('*');
        
      if (inventoryError) {
        console.error('Error loading inventory for availability check:', inventoryError);
        return beverages;
      }
      
      const inventory = inventoryData || [];
      
      // Check each beverage's required inventory
      return beverages.map(beverage => {
        // If no required inventory, keep current availability
        if (!beverage.required_inventory || beverage.required_inventory.length === 0) {
          return beverage;
        }
        
        // Check if all required inventory items are available (quantity > 0)
        const allIngredientsAvailable = beverage.required_inventory.every(ingredientName => {
          const inventoryItem = inventory.find(item => item.name === ingredientName);
          return inventoryItem && inventoryItem.quantity > 0;
        });
        
        // Update availability based on inventory
        return {
          ...beverage,
          available: allIngredientsAvailable
        };
      });
    } catch (err) {
      console.error('Error checking beverage availability:', err);
      return beverages;
    }
  };

  const [filteredBeverages, setFilteredBeverages] = useState<MenuItem[]>([]);

  const filterBeverages = () => {
    let filtered = beverages;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredBeverages(filtered);
  };

  const getRequiredInventoryStatus = (beverage: MenuItem) => {
    if (!beverage.required_inventory || beverage.required_inventory.length === 0) {
      return { complete: true, missing: [] };
    }
    
    const missing = beverage.required_inventory.filter(ingredientName => {
      const inventoryItem = inventoryItems.find(item => item.name === ingredientName);
      return !inventoryItem || inventoryItem.quantity <= 0;
    });
    
    return {
      complete: missing.length === 0,
      missing
    };
  };

  // Don't show loading if user is not logged in
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading beverages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Beverages Loading Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={loadBeverages}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bar Menu</h1>
          <p className="text-gray-600">View all available beverages and drinks</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {filteredBeverages.length} of {beverages.length} beverages
          </div>
          <button
            onClick={() => {
              loadBeverages();
              loadInventory();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search beverages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Beverages Grid */}
      {filteredBeverages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBeverages.map((beverage) => {
            const inventoryStatus = getRequiredInventoryStatus(beverage);
            
            return (
              <div key={beverage.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 h-32 flex items-center justify-center">
                  {beverage.image_url ? (
                    <img 
                      src={beverage.image_url} 
                      alt={beverage.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Wine className="w-12 h-12 text-purple-400" />
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{beverage.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        beverage.available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {beverage.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{beverage.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      <Tag className="w-3 h-3" />
                      {beverage.category}
                    </span>
                    <span className="flex items-center gap-1 text-xl font-bold text-gray-900">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      {typeof beverage.price === 'number' ? beverage.price.toFixed(2).replace('.', ',') : beverage.price}
                    </span>
                  </div>

                  {/* Required Inventory Status */}
                  {beverage.required_inventory && beverage.required_inventory.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                        <Info className="w-3 h-3" />
                        <span>Required ingredients:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {beverage.required_inventory.map((ingredient, idx) => {
                          const inventoryItem = inventoryItems.find(item => item.name === ingredient);
                          const isAvailable = inventoryItem && inventoryItem.quantity > 0;
                          
                          return (
                            <span 
                              key={idx} 
                              className={`text-xs px-2 py-1 rounded-full ${
                                isAvailable 
                                  ? 'bg-green-50 text-green-700' 
                                  : 'bg-red-50 text-red-700'
                              }`}
                              title={isAvailable ? 'In stock' : 'Out of stock'}
                            >
                              {ingredient}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Additional Details */}
                  {(beverage.preparation_time || beverage.calories || (beverage.ingredients && beverage.ingredients.length > 0)) && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {beverage.preparation_time && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                            Prep: {beverage.preparation_time} min
                          </span>
                        )}
                        {beverage.calories && (
                          <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full">
                            {beverage.calories} cal
                          </span>
                        )}
                        {beverage.ingredients && beverage.ingredients.length > 0 && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {beverage.ingredients.length} ingredients
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Wine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No beverages found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No beverages are currently available'
            }
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
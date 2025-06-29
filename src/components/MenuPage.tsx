import React, { useState, useEffect } from 'react';
import { Search, Filter, Utensils, AlertCircle, RefreshCw, Plus, Edit, Trash2, Power, PowerOff, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, MenuItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    available: true
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const predefinedCategories = [
    'Food',
    'Drink',
    'Dessert',
    'Appetizer',
    'Main Course',
    'Side Dish',
    'Beverage',
    'Alcohol',
    'Coffee',
    'Tea'
  ];

  useEffect(() => {
    // Only load data if user exists
    if (user) {
      loadMenuItems();
    } else {
      // If no user, don't load data and stop loading
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    filterItems();
  }, [menuItems, searchTerm, selectedCategory]);

  const loadMenuItems = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching menu items from Supabase...');
      
      const { data, error: fetchError } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setError(`Failed to load menu items: ${fetchError.message}`);
        return;
      }

      console.log('Menu items fetched:', data);

      if (!data || data.length === 0) {
        setError('No menu items found in the database');
        setMenuItems([]);
        return;
      }

      setMenuItems(data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      setCategories(uniqueCategories);
      
      console.log('Categories found:', uniqueCategories);
      
    } catch (err) {
      console.error('Error loading menu items:', err);
      setError('An unexpected error occurred while loading the menu');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = menuItems;

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

    setFilteredItems(filtered);
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const newAvailability = !item.available;
      
      const { error } = await supabase
        .from('menu_items')
        .update({ available: newAvailability })
        .eq('id', item.id);

      if (error) {
        console.error('Error updating availability:', error);
        alert('Failed to update item availability');
        return;
      }

      // Update local state
      setMenuItems(prev => prev.map(menuItem => 
        menuItem.id === item.id 
          ? { ...menuItem, available: newAvailability }
          : menuItem
      ));

      // Show success message
      const statusText = newAvailability ? 'available' : 'unavailable';
      alert(`${item.name} is now ${statusText}`);
      
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Failed to update item availability');
    }
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price.toString(),
      available: item.available
    });
    setEditError('');
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      available: true
    });
    setEditError('');
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    setEditLoading(true);
    setEditError('');

    // Validation
    if (!editFormData.name.trim()) {
      setEditError('Menu item name is required');
      setEditLoading(false);
      return;
    }

    if (!editFormData.description.trim()) {
      setEditError('Description is required');
      setEditLoading(false);
      return;
    }

    if (!editFormData.price || parseFloat(editFormData.price) <= 0) {
      setEditError('Please enter a valid price greater than 0');
      setEditLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: editFormData.name.trim(),
          description: editFormData.description.trim(),
          category: editFormData.category,
          price: parseFloat(editFormData.price),
          available: editFormData.available
        })
        .eq('id', editingItem.id);

      if (error) {
        console.error('Error updating menu item:', error);
        setEditError(`Failed to update menu item: ${error.message}`);
        return;
      }

      // Update local state
      setMenuItems(prev => prev.map(item => 
        item.id === editingItem.id 
          ? {
              ...item,
              name: editFormData.name.trim(),
              description: editFormData.description.trim(),
              category: editFormData.category,
              price: parseFloat(editFormData.price),
              available: editFormData.available
            }
          : item
      ));

      closeEditModal();
      alert('Menu item updated successfully!');
      
    } catch (error) {
      console.error('Error updating menu item:', error);
      setEditError('An unexpected error occurred while updating the menu item');
    } finally {
      setEditLoading(false);
    }
  };

  const deleteMenuItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting menu item:', error);
        alert('Failed to delete menu item');
        return;
      }

      // Update local state
      setMenuItems(prev => prev.filter(item => item.id !== itemId));
      alert('Menu item deleted successfully');
      
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item');
    }
  };

  const addToCart = async (item: MenuItem) => {
    if (!user) {
      alert('Please sign in to add items to cart');
      return;
    }

    try {
      console.log('Adding item to cart:', item);
      
      // Create a new order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_id: user.id,
            customer_name: user.name || 'Customer',
            status: 'pending',
            total: item.price,
          },
        ])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        alert('Failed to add item to cart');
        return;
      }

      // Add order item
      const { error: orderItemError } = await supabase
        .from('order_items')
        .insert([
          {
            order_id: orderData.id,
            menu_item_id: item.id,
            quantity: 1,
            price: item.price,
          },
        ]);

      if (orderItemError) {
        console.error('Error creating order item:', orderItemError);
        alert('Failed to add item to cart');
        return;
      }

      alert(`${item.name} added to cart!`);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart');
    }
  };

  // Don't show loading if user is not logged in
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading menu items...</p>
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
            <h3 className="text-lg font-semibold text-red-800 mb-2">Menu Loading Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={loadMenuItems}
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
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'manager' ? 'Menu Management' : 'Our Menu'}
          </h1>
          <p className="text-gray-600">
            {user?.role === 'manager' 
              ? 'Manage your restaurant menu items' 
              : 'Discover our delicious offerings'
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {filteredItems.length} of {menuItems.length} items
          </div>
          {user?.role === 'manager' && (
            <button
              onClick={() => navigate('/add-menu-item')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 rounded-lg text-sm">
          <p><strong>Debug Info:</strong></p>
          <p>Total Menu Items: {menuItems.length}</p>
          <p>Filtered Items: {filteredItems.length}</p>
          <p>Categories: {categories.join(', ')}</p>
          <p>Search Term: "{searchTerm}"</p>
          <p>Selected Category: {selectedCategory}</p>
        </div>
      )}

      {/* Menu Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-48 flex items-center justify-center">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Utensils className="w-16 h-16 text-gray-400" />
                )}
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                    {user?.role === 'manager' && (
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`p-1 rounded-full transition-colors ${
                          item.available 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={`Mark as ${item.available ? 'unavailable' : 'available'}`}
                      >
                        {item.available ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {item.category}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    €{typeof item.price === 'number' ? item.price.toFixed(2).replace('.', ',') : item.price}
                  </span>
                </div>
                
                {user?.role === 'customer' && (
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.available}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      item.available
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {item.available ? 'Add to Cart' : 'Unavailable'}
                  </button>
                )}
                
                {user?.role === 'manager' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => deleteMenuItem(item.id, item.name)}
                      className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No menu items found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No menu items are currently available'
            }
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
          {user?.role === 'manager' && !searchTerm && selectedCategory === 'all' && (
            <button
              onClick={() => navigate('/add-menu-item')}
              className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add First Menu Item
            </button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Edit Menu Item</h2>
                    <p className="opacity-90">Update item details</p>
                  </div>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Error Message */}
              {editError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-700 font-medium">{editError}</p>
                  </div>
                </div>
              )}

              {/* Menu Item Name */}
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Menu Item Name *
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  required
                />
              </div>

              {/* Category and Price Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    id="edit-category"
                    name="category"
                    value={editFormData.category}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    {predefinedCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-2">
                    Price (€) *
                  </label>
                  <input
                    type="number"
                    id="edit-price"
                    name="price"
                    value={editFormData.price}
                    onChange={handleEditInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="edit-available"
                  name="available"
                  checked={editFormData.available}
                  onChange={handleEditInputChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="edit-available" className="text-sm font-medium text-gray-700">
                  Available for ordering
                </label>
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    editFormData.available 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {editFormData.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editLoading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {editLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
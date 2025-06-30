import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Minus, AlertTriangle, CheckCircle, 
  RefreshCw, Filter, Save, X, Edit, Trash2, AlertCircle, 
  Download, Upload, BarChart, Droplet, Wine, Coffee, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase, InventoryItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function BarInventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Alcohol',
    quantity: 0,
    unit: 'bottles',
    threshold: 5,
    notes: '',
    is_critical: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (user && user.role === 'bar') {
      loadInventory();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    filterItems();
  }, [inventoryItems, searchTerm, selectedCategory]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading bar inventory...');
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error loading inventory:', error);
        setError('Failed to load inventory items: ' + error.message);
        return;
      }
      
      // Update status based on quantity vs threshold
      const itemsWithStatus = (data || []).map(item => ({
        ...item,
        status: getItemStatus(item.quantity, item.threshold)
      }));
      
      setInventoryItems(itemsWithStatus);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(itemsWithStatus.map(item => item.category))];
      setCategories(uniqueCategories);
      
      console.log('Inventory loaded:', itemsWithStatus.length, 'items');
      console.log('Categories found:', uniqueCategories);
      
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('An unexpected error occurred while loading the inventory');
    } finally {
      setLoading(false);
    }
  };

  const getItemStatus = (quantity: number, threshold: number): 'sufficient' | 'low' | 'critical' => {
    if (quantity <= 0) return 'critical';
    if (quantity <= threshold * 0.3) return 'critical';
    if (quantity <= threshold) return 'low';
    return 'sufficient';
  };

  const filterItems = () => {
    let filtered = inventoryItems;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredItems(filtered);
  };

  const updateQuantity = async (id: string, change: number) => {
    try {
      const item = inventoryItems.find(item => item.id === id);
      if (!item) return;
      
      const newQuantity = Math.max(0, item.quantity + change);
      
      // Update in database
      const { error } = await supabase
        .from('inventory_items')
        .update({ 
          quantity: newQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) {
        console.error('Error updating inventory quantity:', error);
        setError('Failed to update quantity: ' + error.message);
        return;
      }
      
      // Update local state
      setInventoryItems(prev => prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            quantity: newQuantity,
            status: getItemStatus(newQuantity, item.threshold),
            last_updated: new Date().toISOString()
          };
        }
        return item;
      }));
      
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError('Failed to update quantity');
    }
  };

  const handleAddItem = () => {
    setFormData({
      name: '',
      category: 'Alcohol',
      quantity: 0,
      unit: 'bottles',
      threshold: 5,
      notes: '',
      is_critical: true
    });
    setShowAddModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      threshold: item.threshold,
      notes: item.notes || '',
      is_critical: item.is_critical !== false // Default to true if undefined
    });
    setShowEditModal(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item? This may affect menu item availability.')) {
      try {
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.error('Error deleting inventory item:', error);
          setError('Failed to delete item: ' + error.message);
          return;
        }
        
        setInventoryItems(prev => prev.filter(item => item.id !== id));
        
      } catch (err) {
        console.error('Error deleting item:', err);
        setError('Failed to delete item');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (name === 'quantity' || name === 'threshold') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSaveNewItem = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name for the item');
      return;
    }

    setIsSaving(true);

    try {
      const newItem = {
        name: formData.name.trim(),
        category: formData.category,
        quantity: formData.quantity,
        unit: formData.unit,
        threshold: formData.threshold,
        notes: formData.notes.trim() || null,
        last_updated: new Date().toISOString(),
        is_critical: formData.is_critical
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert([newItem])
        .select();
        
      if (error) {
        console.error('Error adding inventory item:', error);
        setError('Failed to add item: ' + error.message);
        return;
      }
      
      if (data && data.length > 0) {
        const addedItem = {
          ...data[0],
          status: getItemStatus(data[0].quantity, data[0].threshold)
        };
        
        setInventoryItems(prev => [...prev, addedItem]);
      }
      
      setShowAddModal(false);
      
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!currentItem || !formData.name.trim()) {
      alert('Please enter a name for the item');
      return;
    }

    setIsSaving(true);

    try {
      const updatedItem = {
        name: formData.name.trim(),
        category: formData.category,
        quantity: formData.quantity,
        unit: formData.unit,
        threshold: formData.threshold,
        notes: formData.notes.trim() || null,
        last_updated: new Date().toISOString(),
        is_critical: formData.is_critical
      };

      const { error } = await supabase
        .from('inventory_items')
        .update(updatedItem)
        .eq('id', currentItem.id);
        
      if (error) {
        console.error('Error updating inventory item:', error);
        setError('Failed to update item: ' + error.message);
        return;
      }
      
      setInventoryItems(prev => prev.map(item => {
        if (item.id === currentItem.id) {
          return {
            ...item,
            ...updatedItem,
            status: getItemStatus(updatedItem.quantity, updatedItem.threshold)
          };
        }
        return item;
      }));
      
      setShowEditModal(false);
      setCurrentItem(null);
      
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sufficient':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sufficient':
        return <CheckCircle className="w-4 h-4" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'alcohol':
        return <Wine className="w-4 h-4" />;
      case 'coffee':
        return <Coffee className="w-4 h-4" />;
      case 'juices':
        return <Droplet className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const exportInventory = () => {
    const headers = ['Name', 'Category', 'Quantity', 'Unit', 'Threshold', 'Status', 'Critical', 'Last Updated', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...inventoryItems.map(item => [
        `"${item.name}"`,
        `"${item.category}"`,
        item.quantity,
        `"${item.unit}"`,
        item.threshold,
        `"${item.status}"`,
        item.is_critical === false ? 'No' : 'Yes',
        `"${new Date(item.last_updated).toLocaleString()}"`,
        `"${item.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bar-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Don't show loading if user is not logged in or not bar staff
  if (!user || user.role !== 'bar') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">Only bar staff can access inventory management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bar Inventory</h1>
          <p className="text-gray-600">Manage your bar stock and supplies</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadInventory}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportInventory}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventoryItems.length}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sufficient Stock</p>
              <p className="text-2xl font-bold text-green-600">
                {inventoryItems.filter(item => item.status === 'sufficient').length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">
                {inventoryItems.filter(item => item.status === 'low').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {inventoryItems.filter(item => item.status === 'critical').length}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search inventory items..."
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

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Inventory Items</h3>
        </div>
        <div className="overflow-x-auto">
          {filteredItems.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Critical
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          {item.notes && (
                            <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getCategoryIcon(item.category)}
                        <span className="ml-2 text-sm text-gray-900">{item.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-gray-900">
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Threshold: {item.threshold} {item.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 capitalize">{item.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.is_critical === false 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.is_critical === false ? 'Optional' : 'Critical'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.last_updated).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No inventory items found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No inventory items are currently available'
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
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add Inventory Item</h2>
                    <p className="opacity-90">Add a new item to your bar inventory</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Vodka"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="Alcohol">Alcohol</option>
                  <option value="Mixers">Mixers</option>
                  <option value="Juices">Juices</option>
                  <option value="Fruit">Fruit</option>
                  <option value="Herbs">Herbs</option>
                  <option value="Syrups">Syrups</option>
                  <option value="Coffee">Coffee</option>
                  <option value="Tea">Tea</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Essentials">Essentials</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="bottles">bottles</option>
                    <option value="liters">liters</option>
                    <option value="kg">kg</option>
                    <option value="pieces">pieces</option>
                    <option value="bunches">bunches</option>
                    <option value="boxes">boxes</option>
                    <option value="cans">cans</option>
                    <option value="bags">bags</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold *
                </label>
                <input
                  type="number"
                  name="threshold"
                  value={formData.threshold}
                  onChange={handleInputChange}
                  min="1"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alert will be shown when quantity falls below this threshold
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_critical"
                  name="is_critical"
                  checked={formData.is_critical}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="is_critical" className="text-sm font-medium text-gray-700">
                    Critical Ingredient
                  </label>
                  <p className="text-xs text-gray-500">
                    If marked as critical, drinks requiring this ingredient will be unavailable when out of stock
                  </p>
                </div>
                <div className="text-purple-600">
                  {formData.is_critical ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Optional notes about this item"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewItem}
                  disabled={isSaving}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Item
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && currentItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Edit Inventory Item</h2>
                    <p className="opacity-90">Update item details</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentItem(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Vodka"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Alcohol">Alcohol</option>
                  <option value="Mixers">Mixers</option>
                  <option value="Juices">Juices</option>
                  <option value="Fruit">Fruit</option>
                  <option value="Herbs">Herbs</option>
                  <option value="Syrups">Syrups</option>
                  <option value="Coffee">Coffee</option>
                  <option value="Tea">Tea</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Essentials">Essentials</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="bottles">bottles</option>
                    <option value="liters">liters</option>
                    <option value="kg">kg</option>
                    <option value="pieces">pieces</option>
                    <option value="bunches">bunches</option>
                    <option value="boxes">boxes</option>
                    <option value="cans">cans</option>
                    <option value="bags">bags</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold *
                </label>
                <input
                  type="number"
                  name="threshold"
                  value={formData.threshold}
                  onChange={handleInputChange}
                  min="1"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alert will be shown when quantity falls below this threshold
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="edit_is_critical"
                  name="is_critical"
                  checked={formData.is_critical}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="edit_is_critical" className="text-sm font-medium text-gray-700">
                    Critical Ingredient
                  </label>
                  <p className="text-xs text-gray-500">
                    If marked as critical, drinks requiring this ingredient will be unavailable when out of stock
                  </p>
                </div>
                <div className="text-blue-600">
                  {formData.is_critical ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Optional notes about this item"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateItem}
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Update Item
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Insights */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <BarChart className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Inventory Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm opacity-90">
              <div>
                <p>• {inventoryItems.filter(item => item.status === 'critical').length} items need immediate attention</p>
                <p>• {inventoryItems.filter(item => item.status === 'low').length} items are running low</p>
              </div>
              <div>
                <p>• Most stocked category: {
                  [...categories].sort((a, b) => {
                    const countA = inventoryItems.filter(item => item.category === a).length;
                    const countB = inventoryItems.filter(item => item.category === b).length;
                    return countB - countA;
                  })[0] || 'None'
                }</p>
                <p>• Last inventory update: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
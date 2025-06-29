import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, AlertCircle, CheckCircle, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function AddMenuItem() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Food',
    price: '',
    available: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not manager
  if (user?.role !== 'manager') {
    navigate('/dashboard');
    return null;
  }

  const categories = [
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (!formData.name.trim()) {
      setError('Menu item name is required');
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      setLoading(false);
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Please enter a valid price greater than 0');
      setLoading(false);
      return;
    }

    try {
      console.log('Creating menu item:', formData);

      const { data, error: insertError } = await supabase
        .from('menu_items')
        .insert([
          {
            name: formData.name.trim(),
            description: formData.description.trim(),
            category: formData.category,
            price: parseFloat(formData.price),
            available: formData.available
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating menu item:', insertError);
        setError(`Failed to create menu item: ${insertError.message}`);
        return;
      }

      console.log('Menu item created successfully:', data);
      setSuccess('Menu item created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'Food',
        price: '',
        available: true
      });

      // Auto-redirect after success
      setTimeout(() => {
        navigate('/menu');
      }, 2000);

    } catch (err) {
      console.error('Error creating menu item:', err);
      setError('An unexpected error occurred while creating the menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/menu')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </button>
        <div className="h-6 w-px bg-gray-300"></div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Menu Item</h1>
          <p className="text-gray-600">Create a new item for your restaurant menu</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">New Menu Item</h2>
                <p className="opacity-90">Fill in the details below</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Success Message */}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 font-medium">{success}</p>
                </div>
                <p className="text-green-600 text-sm mt-1">Redirecting to menu page...</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Menu Item Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Menu Item Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Margherita Pizza"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the menu item, ingredients, or special features..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                required
              />
            </div>

            {/* Category and Price Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price (€) *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0,00"
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
                id="available"
                name="available"
                checked={formData.available}
                onChange={handleInputChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="available" className="text-sm font-medium text-gray-700">
                Available for ordering
              </label>
              <div className="ml-auto">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  formData.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {formData.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/menu')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Menu Item
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Card */}
      {(formData.name || formData.description || formData.price) && (
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-32 flex items-center justify-center">
              <Utensils className="w-12 h-12 text-gray-400" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-lg font-semibold text-gray-900">
                  {formData.name || 'Menu Item Name'}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  formData.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {formData.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-3">
                {formData.description || 'Menu item description will appear here...'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {formData.category}
                </span>
                <span className="text-xl font-bold text-gray-900">
                  €{formData.price ? parseFloat(formData.price).toFixed(2).replace('.', ',') : '0,00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
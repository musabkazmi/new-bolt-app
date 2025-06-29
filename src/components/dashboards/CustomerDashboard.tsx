import React, { useState, useEffect } from 'react';
import { Star, Heart, ShoppingCart, Clock, Utensils, AlertCircle, ChevronRight, MapPin, User, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, MenuItem, Order } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function CustomerDashboard() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Only load data if user exists
    if (user) {
      loadData();
    } else {
      // If no user, don't load data and stop loading
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setError(t('error.userNotFound'));
      setLoading(false);
      return;
    }

    try {
      console.log('Loading data for user:', user);
      setError(''); // Clear any previous errors
      
      // Load menu items with better error handling
      console.log('Fetching menu items...');
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .limit(6); // Show more items on dashboard

      if (menuError) {
        console.error('Error loading menu items:', menuError);
        setError(`${t('error.failedToLoad')} ${t('menu.title')}: ${menuError.message}`);
      } else {
        console.log('Menu items loaded:', menuData?.length || 0, 'items');
        setMenuItems(menuData || []);
      }

      // Load recent orders
      console.log('Fetching recent orders...');
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        // Don't set error for orders as it's not critical for the dashboard
      } else {
        console.log('Orders loaded:', ordersData?.length || 0, 'orders');
        setRecentOrders(ordersData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(t('error.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (item: MenuItem) => {
    if (!user) {
      setError(t('error.userNotFound'));
      return;
    }

    try {
      console.log('Adding item to cart:', item);
      
      // Add to local cart state immediately for better UX
      setCartItems(prev => [...prev, item]);
      
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
        setError(t('error.failedToLoad'));
        // Remove from cart if order creation failed
        setCartItems(prev => prev.filter(cartItem => cartItem.id !== item.id));
        return;
      }

      console.log('Order created:', orderData);

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
        setError(t('error.failedToLoad'));
        return;
      }

      console.log('Order item created successfully');
      
      // Refresh orders
      await loadData();
      
      // Clear any previous errors
      setError('');
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(t('error.failedToLoad'));
      // Remove from cart if there was an error
      setCartItems(prev => prev.filter(cartItem => cartItem.id !== item.id));
    }
  };

  const handleOrderClick = (orderId: string) => {
    console.log('Order clicked:', orderId);
    // Navigate to orders page with the specific order highlighted
    navigate(`/orders?order=${orderId}`);
  };

  const handleViewAllOrders = () => {
    // Navigate to the full orders page
    navigate('/orders');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'served':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'preparing':
        return <Utensils className="w-4 h-4" />;
      case 'ready':
        return <AlertCircle className="w-4 h-4" />;
      case 'served':
        return <Star className="w-4 h-4" />;
      case 'completed':
        return <Star className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
          <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.welcome')}, {user?.name}!</h1>
          <p className="text-gray-600">{t('dashboard.discoverDeliciousMeals')}</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => console.log('Cart clicked, items:', cartItems)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            {t('nav.cart')} ({cartItems.length})
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
          <button 
            onClick={() => {
              setError('');
              loadData();
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 text-white">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-2">{t('dashboard.todaysSpecial')}</h2>
          <p className="text-purple-100 mb-4">
            {t('dashboard.freshAtlanticSalmon')}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold">€24,99</span>
            <button 
              onClick={() => {
                const specialItem = menuItems.find(item => item.name.toLowerCase().includes('salmon'));
                if (specialItem) {
                  addToCart(specialItem);
                } else {
                  console.log('Special item not found in menu');
                }
              }}
              className="bg-white text-purple-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              {t('dashboard.orderNow')}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => navigate('/menu')}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="p-3 bg-purple-50 rounded-lg w-fit mx-auto mb-3">
            <Utensils className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-medium text-gray-900">{t('dashboard.browseMenu')}</h3>
          <p className="text-sm text-gray-500">{t('dashboard.viewAllDishes')}</p>
        </button>

        <button 
          onClick={() => console.log('Quick Order clicked')}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="p-3 bg-green-50 rounded-lg w-fit mx-auto mb-3">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-medium text-gray-900">{t('dashboard.quickOrder')}</h3>
          <p className="text-sm text-gray-500">{t('dashboard.reorderFavorites')}</p>
        </button>

        <button 
          onClick={() => console.log('Reviews clicked')}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="p-3 bg-blue-50 rounded-lg w-fit mx-auto mb-3">
            <Star className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-medium text-gray-900">{t('dashboard.reviews')}</h3>
          <p className="text-sm text-gray-500">{t('dashboard.rateYourMeals')}</p>
        </button>

        <button 
          onClick={() => console.log('Favorites clicked')}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="p-3 bg-red-50 rounded-lg w-fit mx-auto mb-3">
            <Heart className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-medium text-gray-900">{t('dashboard.favorites')}</h3>
          <p className="text-sm text-gray-500">{t('dashboard.savedItems')}</p>
        </button>
      </div>

      {/* Featured Items */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.featuredItems')}</h3>
            <button 
              onClick={() => navigate('/menu')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              {t('common.viewAll')} {t('menu.title')} →
            </button>
          </div>
        </div>
        <div className="p-6">
          {menuItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <div key={item.id} className="group cursor-pointer border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg h-32 mb-4 flex items-center justify-center">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Utensils className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors mb-1">
                    {item.name}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {item.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.available ? t('common.available') : t('common.unavailable')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      €{typeof item.price === 'number' ? item.price.toFixed(2).replace('.', ',') : item.price}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={!item.available}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        item.available
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {item.available ? t('menu.addToCart') : t('common.unavailable')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('error.noMenuItems')}</p>
              <button 
                onClick={loadData}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                {t('error.refreshMenu')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order History - Enhanced Clickable Cards */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentOrders')}</h3>
            {recentOrders.length > 0 && (
              <button 
                onClick={handleViewAllOrders}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
              >
                {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  onClick={() => handleOrderClick(order.id)}
                  className="group relative bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200 hover:border-purple-300 rounded-xl p-6 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-lg">
                        {order.table_number ? (
                          <span className="font-bold text-lg">T{order.table_number}</span>
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-purple-800 transition-colors text-lg">
                          {t('orders.orderNumber')}{order.id.slice(0, 8)}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {order.customer_name || 'Anonymous Order'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {t(`orders.${order.status}`).toUpperCase()}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    
                    {order.table_number && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">Table {order.table_number}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-lg font-bold text-purple-600">€{order.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>

                  {/* Action Indicator */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-purple-600 group-hover:text-purple-700 transition-colors">
                      <span className="text-sm font-medium">{t('common.clickToEdit')}</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-purple-600 bg-opacity-0 group-hover:bg-opacity-5 rounded-xl transition-all duration-200"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-purple-50 rounded-xl p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">{t('dashboard.noOrders')}</h4>
                <p className="text-gray-500 mb-6 text-sm">
                  Starten Sie Ihre erste Bestellung und entdecken Sie unsere köstlichen Gerichte!
                </p>
                <button 
                  onClick={() => navigate('/menu')}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  {t('dashboard.browseMenu')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
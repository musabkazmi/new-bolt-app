import React, { useState, useEffect } from 'react';
import { Wine, Clock, CheckCircle2, AlertTriangle, Bell, Volume2, VolumeX, BookOpen, Package } from 'lucide-react';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

export default function BarDashboard() {
  const [drinkOrders, setDrinkOrders] = useState<(Order & { order_items: (OrderItem & { menu_item: any })[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState({
    pendingDrinks: 0,
    completedToday: 0,
    avgPrepTime: 5,
    activeTables: 0,
    lowStockItems: 3
  });
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Only load data if user exists and is bar staff
    if (user && user.role === 'bar') {
      loadDrinkOrders();
      loadStats();
      
      // Set up real-time subscription for new drink orders
      const subscription = supabase
        .channel('bar-orders')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'order_items',
            filter: 'menu_item.category=in.(Drink,Beverage,Alcohol,Coffee,Tea,Wine,Beer,Cocktail)'
          }, 
          (payload) => {
            console.log('New drink order detected:', payload);
            if (soundEnabled && payload.eventType === 'INSERT') {
              playNotificationSound();
            }
            loadDrinkOrders();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else if (user) {
      // If user exists but not bar staff, stop loading
      setLoading(false);
    }
  }, [user, soundEnabled]);

  const playNotificationSound = () => {
    // Create a simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const loadDrinkOrders = async () => {
    if (!user || user.role !== 'bar') {
      setLoading(false);
      return;
    }

    try {
      console.log('Loading drink orders for bar staff...');

      // Get orders that contain drink items
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_item:menu_items (*)
          )
        `)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading orders:', error);
        setLoading(false);
        return;
      }

      console.log('All orders loaded:', data?.length || 0);
      console.log('Sample order items:', data?.[0]?.order_items);

      // Filter orders to only include those with drink items
      // Define drink categories in lowercase for case-insensitive comparison
      const drinkCategories = ['drink', 'beverage', 'alcohol', 'coffee', 'tea', 'wine', 'beer', 'cocktail'];
      
      const ordersWithDrinks = (data || []).map(order => {
        // Log each order's items for debugging
        console.log(`Order #${order.id.slice(0, 8)} items:`, order.order_items?.map(item => ({
          name: item.menu_item?.name,
          category: item.menu_item?.category,
          isDrink: item.menu_item && drinkCategories.some(category => 
            (item.menu_item.category || '').toLowerCase().includes(category)
          )
        })));
        
        return {
          ...order,
          order_items: (order.order_items || []).filter(item => {
            // Check if this item is a drink
            const isDrink = item.menu_item && drinkCategories.some(category => 
              (item.menu_item.category || '').toLowerCase().includes(category.toLowerCase())
            );
            
            if (isDrink) {
              console.log(`Found drink item: ${item.menu_item?.name} (${item.menu_item?.category})`);
            }
            
            return isDrink;
          })
        };
      }).filter(order => order.order_items.length > 0);

      console.log('Drink orders filtered:', ordersWithDrinks.length);
      ordersWithDrinks.forEach(order => {
        console.log(`Order #${order.id.slice(0, 8)} has ${order.order_items.length} drink items`);
      });
      
      // Only show pending/preparing orders
      const pendingOrders = ordersWithDrinks.filter(order => 
        order.status === 'pending' || order.status === 'preparing' || 
        order.order_items.some(item => item.status === 'pending' || item.status === 'preparing')
      );
      
      setDrinkOrders(pendingOrders);

      // Calculate stats
      const pendingDrinks = pendingOrders.reduce((count, order) => 
        count + order.order_items.filter(item => item.status === 'pending' || item.status === 'preparing').length, 0
      );
      
      const activeTables = new Set(ordersWithDrinks.map(order => order.table_number).filter(Boolean)).size;

      setStats(prev => ({
        ...prev,
        pendingDrinks,
        activeTables
      }));

    } catch (error) {
      console.error('Error loading drink orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user || user.role !== 'bar') {
      return;
    }

    try {
      // Load today's completed drink orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          menu_item:menu_items (*),
          order:orders (*)
        `)
        .eq('status', 'ready')
        .gte('created_at', today.toISOString());

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      // Filter for drink items only
      const drinkCategories = ['drink', 'beverage', 'alcohol', 'coffee', 'tea', 'wine', 'beer', 'cocktail'];
      const completedDrinks = (data || []).filter(item => 
        item.menu_item && drinkCategories.some(category => 
          (item.menu_item.category || '').toLowerCase().includes(category.toLowerCase())
        )
      );

      console.log('Completed drinks today:', completedDrinks.length);
      
      setStats(prev => ({ 
        ...prev, 
        completedToday: completedDrinks.length 
      }));

      // Get low stock items count (mock data for now)
      setStats(prev => ({
        ...prev,
        lowStockItems: 3
      }));

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const updateDrinkStatus = async (itemId: string, status: string) => {
    try {
      console.log('Updating drink status:', itemId, 'to', status);

      const { error } = await supabase
        .from('order_items')
        .update({ status })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating drink status:', error);
        return;
      }

      // Reload orders to reflect changes
      loadDrinkOrders();
      
      // Play success sound for completed drinks
      if (status === 'ready' && soundEnabled) {
        playNotificationSound();
      }

    } catch (error) {
      console.error('Error updating drink status:', error);
    }
  };

  const getDrinkStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDrinkStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'preparing':
        return <Wine className="w-4 h-4" />;
      case 'ready':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const navigateToBarMenu = () => {
    navigate('/bar-menu');
  };

  const navigateToInventory = () => {
    navigate('/bar-inventory');
  };

  // Don't show loading if user is not logged in or not bar staff
  if (!user || user.role !== 'bar') {
    return null;
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
          <h1 className="text-3xl font-bold text-gray-900">Bar Dashboard</h1>
          <p className="text-gray-600">Manage drink orders and bar operations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              soundEnabled 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
            }`}
            title={soundEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Sound On' : 'Sound Off'}
          </button>
          <button
            onClick={navigateToBarMenu}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {t('bar.barMenu')}
          </button>
          <button
            onClick={navigateToInventory}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Package className="w-4 h-4" />
            Inventory
          </button>
          <div className="text-sm text-gray-500">
            {stats.pendingDrinks} drinks in queue
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Drinks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingDrinks}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Wine className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Prep Time</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgPrepTime}m</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar Menu Highlight */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Bar Menu</h3>
              <p className="opacity-90 mb-4">
                View all available beverages, drinks, and cocktails in our comprehensive bar menu.
              </p>
              <button 
                onClick={navigateToBarMenu}
                className="bg-white text-purple-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                {t('bar.viewAllBeverages')}
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Highlight */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Package className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Bar Inventory</h3>
              <p className="opacity-90 mb-4">
                Manage your bar stock, track inventory levels, and get alerts for low stock items.
              </p>
              <button 
                onClick={navigateToInventory}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Manage Inventory
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drink Orders List */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Pending Drink Orders</h3>
        </div>
        <div className="p-6">
          {drinkOrders.length > 0 ? (
            <div className="space-y-4">
              {drinkOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-purple-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-lg">
                        {order.table_number ? (
                          <span className="font-bold text-sm">T{order.table_number}</span>
                        ) : (
                          <Wine className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</h4>
                        <p className="text-sm text-gray-500">{order.customer_name}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Wine className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">
                              {item.quantity}x {item.menu_item?.name || 'Unknown Drink'}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-gray-600 italic">Note: {item.notes}</p>
                          )}
                          <p className="text-sm text-gray-500">€{item.price.toFixed(2)} each</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getDrinkStatusColor(item.status)}`}>
                            {getDrinkStatusIcon(item.status)}
                            {item.status.toUpperCase()}
                          </span>
                          
                          <div className="flex gap-2">
                            {item.status === 'pending' && (
                              <button
                                onClick={() => updateDrinkStatus(item.id, 'preparing')}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                              >
                                Start
                              </button>
                            )}
                            {item.status === 'preparing' && (
                              <button
                                onClick={() => updateDrinkStatus(item.id, 'ready')}
                                className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                              >
                                Ready
                              </button>
                            )}
                            {item.status === 'ready' && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                ✓ Ready for pickup
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-purple-50 rounded-xl p-8 max-w-md mx-auto">
                <Wine className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">No Pending Drink Orders</h4>
                <p className="text-gray-500 text-sm">
                  All caught up! No pending drink orders at the moment.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bar Tips */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Wine className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Bar Operations Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm opacity-90">
              <div>
                <p>• Mark drinks as "In Progress" when you start preparing</p>
                <p>• Use "Ready" status when drinks are complete</p>
              </div>
              <div>
                <p>• Sound notifications alert you to new orders</p>
                <p>• Status updates sync with waiter dashboards</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
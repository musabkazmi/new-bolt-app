import React, { useState, useEffect } from 'react';
import { Wine, Clock, CheckCircle2, AlertCircle, Bell, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { supabase, Order, OrderItem, MenuItem, InventoryItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function DrinkOrdersPage() {
  const [drinkOrders, setDrinkOrders] = useState<(Order & { order_items: (OrderItem & { menu_item: any })[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    // Only load data if user exists and is bar staff
    if (user && user.role === 'bar') {
      loadInventory();
      loadDrinkOrders();
      
      // Set up real-time subscription for new drink orders
      const subscription = supabase
        .channel('drink-orders-page')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'order_items'
          }, 
          (payload) => {
            console.log('Order item change detected:', payload);
            if (soundEnabled && payload.eventType === 'INSERT') {
              playNotificationSound();
            }
            loadDrinkOrders();
          }
        )
        .subscribe();

      // Set up subscription for inventory changes
      const inventorySubscription = supabase
        .channel('inventory-changes')
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'inventory_items'
          },
          (payload) => {
            console.log('Inventory change detected:', payload);
            loadInventory();
            // Reload drink orders to update availability
            loadDrinkOrders();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
        inventorySubscription.unsubscribe();
      };
    } else if (user) {
      // If user exists but not bar staff, stop loading
      setLoading(false);
    }
  }, [user, soundEnabled]);

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
      setError('');
      console.log('Loading drink orders for Drink Orders page...');

      // Get all orders that might contain drink items
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_item:menu_items (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading orders:', error);
        setError('Failed to load drink orders. Please try again.');
        setLoading(false);
        return;
      }

      console.log('All orders loaded:', data?.length || 0);

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
      
      // Filter out ready items from each order
      const filteredOrders = ordersWithDrinks.map(order => {
        return {
          ...order,
          order_items: order.order_items.filter(item => 
            item.status === 'pending' || item.status === 'preparing'
          )
        };
      }).filter(order => order.order_items.length > 0);
      
      // Check inventory availability for each drink
      const ordersWithAvailability = filteredOrders.map(order => {
        const itemsWithAvailability = order.order_items.map(item => {
          // Check if all required inventory is available
          let canPrepare = true;
          
          if (item.menu_item && item.menu_item.required_inventory && item.menu_item.required_inventory.length > 0) {
            canPrepare = item.menu_item.required_inventory.every(ingredientName => {
              const inventoryItem = inventoryItems.find(invItem => invItem.name === ingredientName);
              
              // If ingredient is not critical or has stock, it's available
              return !inventoryItem || 
                     inventoryItem.is_critical === false || 
                     inventoryItem.quantity > 0;
            });
          }
          
          return {
            ...item,
            canPrepare
          };
        });
        
        return {
          ...order,
          order_items: itemsWithAvailability
        };
      });
      
      setDrinkOrders(ordersWithAvailability);

    } catch (error) {
      console.error('Error loading drink orders:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateDrinkStatus = async (itemId: string, status: string, menuItem: MenuItem) => {
    try {
      console.log('Updating drink status:', itemId, 'to', status);

      // Check if we need to update inventory (only when preparing or ready)
      if ((status === 'preparing' || status === 'ready') && menuItem.required_inventory && menuItem.required_inventory.length > 0) {
        // For 'preparing', we'll reserve the ingredients
        // For 'ready', we'll consume the ingredients
        const consumeInventory = status === 'ready';
        
        // Update inventory for each required ingredient
        for (const ingredientName of menuItem.required_inventory) {
          // Find the inventory item
          const { data: inventoryItems, error: findError } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('name', ingredientName)
            .limit(1);
            
          if (findError) {
            console.error(`Error finding inventory item ${ingredientName}:`, findError);
            continue;
          }
          
          if (!inventoryItems || inventoryItems.length === 0) {
            console.warn(`Inventory item ${ingredientName} not found`);
            continue;
          }
          
          const inventoryItem = inventoryItems[0];
          
          // Only consume if we're marking as ready and have enough quantity
          // Skip consumption for non-critical ingredients if they're out of stock
          if (consumeInventory && 
              (inventoryItem.quantity > 0 || inventoryItem.is_critical === false)) {
            
            // If it's a critical ingredient with quantity > 0 or a non-critical ingredient, update it
            if (inventoryItem.quantity > 0 || inventoryItem.is_critical === false) {
              // For non-critical ingredients, don't reduce below 0
              const newQuantity = inventoryItem.is_critical === false 
                ? Math.max(0, inventoryItem.quantity - 1)
                : inventoryItem.quantity - 1;
                
              const { error: updateError } = await supabase
                .from('inventory_items')
                .update({ 
                  quantity: newQuantity,
                  last_updated: new Date().toISOString()
                })
                .eq('id', inventoryItem.id);
                
              if (updateError) {
                console.error(`Error updating inventory for ${ingredientName}:`, updateError);
              } else {
                console.log(`Consumed 1 unit of ${ingredientName} from inventory`);
              }
            }
          }
        }
      }

      // Update the order item status
      const { error } = await supabase
        .from('order_items')
        .update({ status })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating drink status:', error);
        setError('Failed to update drink status. Please try again.');
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
      setError('Failed to update drink status. Please try again.');
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

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'served':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Don't show loading if user is not logged in or not bar staff
  if (!user || user.role !== 'bar') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">Only bar staff can access drink orders.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">{t('nav.drinkOrders')}</h1>
          <p className="text-gray-600">{t('dashboard.manageAllDrinkOrders')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              soundEnabled 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
            }`}
            title={soundEnabled ? t('bar.disableNotifications') : t('bar.enableNotifications')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? t('bar.soundOn') : t('bar.soundOff')}
          </button>
          <button
            onClick={() => {
              loadDrinkOrders();
              loadInventory();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh')}
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

      {/* Drink Orders List */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{t('bar.allDrinkOrders')}</h3>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">{t('bar.realTimeUpdates')}</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {drinkOrders.length > 0 ? (
            <div className="space-y-6">
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
                        <p className="text-sm text-gray-500">{order.customer_name || t('common.guest')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                        {t(`orders.${order.status}`).toUpperCase()}
                      </span>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {order.order_items?.map((item) => {
                      const canPrepare = 'canPrepare' in item ? item.canPrepare : true;
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Wine className="w-4 h-4 text-purple-600" />
                              <span className="font-medium">
                                {item.quantity}x {item.menu_item?.name || t('bar.unknownDrink')}
                              </span>
                              {!canPrepare && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                  Missing critical ingredients
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-sm text-gray-600 italic">{t('common.notes')}: {item.notes}</p>
                            )}
                            <p className="text-sm text-gray-500">€{item.price.toFixed(2)} {t('orders.each')}</p>
                            
                            {/* Show missing ingredients */}
                            {!canPrepare && item.menu_item?.required_inventory && (
                              <div className="mt-1 text-xs text-red-600">
                                Missing critical: {item.menu_item.required_inventory.filter(ingredientName => {
                                  const inventoryItem = inventoryItems.find(invItem => invItem.name === ingredientName);
                                  return inventoryItem && inventoryItem.is_critical !== false && inventoryItem.quantity <= 0;
                                }).join(', ')}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getDrinkStatusColor(item.status)}`}>
                              {getDrinkStatusIcon(item.status)}
                              {t(`orders.${item.status}`).toUpperCase()}
                            </span>
                            
                            <div className="flex gap-2">
                              {item.status === 'pending' && (
                                <button
                                  onClick={() => updateDrinkStatus(item.id, 'preparing', item.menu_item)}
                                  disabled={!canPrepare}
                                  className={`px-3 py-1 rounded text-xs text-white ${
                                    canPrepare 
                                      ? 'bg-blue-600 hover:bg-blue-700' 
                                      : 'bg-gray-400 cursor-not-allowed'
                                  } transition-colors`}
                                  title={canPrepare ? t('bar.start') : 'Missing critical ingredients'}
                                >
                                  {t('bar.start')}
                                </button>
                              )}
                              {item.status === 'preparing' && (
                                <button
                                  onClick={() => updateDrinkStatus(item.id, 'ready', item.menu_item)}
                                  disabled={!canPrepare}
                                  className={`px-3 py-1 rounded text-xs text-white ${
                                    canPrepare 
                                      ? 'bg-green-600 hover:bg-green-700' 
                                      : 'bg-gray-400 cursor-not-allowed'
                                  } transition-colors`}
                                  title={canPrepare ? t('bar.ready') : 'Missing critical ingredients'}
                                >
                                  {t('bar.ready')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-purple-50 rounded-xl p-8 max-w-md mx-auto">
                <Wine className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">{t('bar.noDrinkOrders')}</h4>
                <p className="text-gray-500 text-sm">
                  {t('bar.allCaughtUp')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
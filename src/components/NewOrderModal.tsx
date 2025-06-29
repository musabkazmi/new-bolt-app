import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart, User, MapPin, Utensils, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { supabase, MenuItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import MenuItemDetailModal from './MenuItemDetailModal';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: () => void;
  prefilledTableNumber?: number;
  prefilledSeatNumber?: number;
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  seatNumber?: number;
}

export default function NewOrderModal({ isOpen, onClose, onOrderPlaced, prefilledTableNumber, prefilledSeatNumber }: NewOrderModalProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      loadMenuItems();
      // Reset form when modal opens
      setOrderItems([]);
      setCustomerName('');
      setTableNumber(prefilledTableNumber?.toString() || '');
      setSeatNumber(prefilledSeatNumber?.toString() || '');
      setError('');
      setSuccess('');
    }
  }, [isOpen, prefilledTableNumber, prefilledSeatNumber]);

  const loadMenuItems = async () => {
    try {
      setLoadingMenu(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) {
        console.error('Error loading menu items:', fetchError);
        setError(t('error.failedToLoad'));
        return;
      }

      setMenuItems(data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
      setError(t('error.failedToLoad'));
    } finally {
      setLoadingMenu(false);
    }
  };

  const addToOrder = (menuItem: MenuItem, itemNotes?: string) => {
    setOrderItems(prev => {
      const existingItem = prev.find(item => 
        item.menuItem.id === menuItem.id && 
        item.seatNumber === (seatNumber ? parseInt(seatNumber) : undefined)
      );
      if (existingItem) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id && 
          item.seatNumber === (seatNumber ? parseInt(seatNumber) : undefined)
            ? { ...item, quantity: item.quantity + 1, notes: itemNotes || item.notes }
            : item
        );
      } else {
        return [...prev, { 
          menuItem, 
          quantity: 1, 
          notes: itemNotes,
          seatNumber: seatNumber ? parseInt(seatNumber) : undefined
        }];
      }
    });
  };

  const updateQuantity = (menuItemId: string, itemSeatNumber: number | undefined, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prev => prev.filter(item => 
        !(item.menuItem.id === menuItemId && item.seatNumber === itemSeatNumber)
      ));
    } else {
      setOrderItems(prev =>
        prev.map(item =>
          item.menuItem.id === menuItemId && item.seatNumber === itemSeatNumber
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  };

  const groupItemsByCategory = () => {
    const grouped: { [key: string]: MenuItem[] } = {};
    menuItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  };

  const generateGuestName = () => {
    const guestNumber = Math.floor(Math.random() * 9999) + 1;
    return `${t('common.guest')} ${guestNumber}`;
  };

  const placeOrder = async () => {
    if (!user) {
      setError(t('error.userNotFound'));
      return;
    }

    // Validation
    if (orderItems.length === 0) {
      setError(t('orders.pleaseAddItems'));
      return;
    }

    const tableNum = tableNumber ? parseInt(tableNumber) : null;
    if (tableNumber && (isNaN(tableNum) || tableNum <= 0)) {
      setError(t('orders.validTableNumber'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      const total = calculateTotal();

      // Generate guest name if customer name is empty
      const finalCustomerName = customerName.trim() || generateGuestName();

      // Create the order data
      const orderData: any = {
        waiter_id: user.id,
        customer_id: null, // Waiter-created orders don't have a customer_id
        table_number: tableNum,
        customer_name: finalCustomerName,
        status: 'pending' as const,
        total: total,
      };

      console.log('Creating order with data:', orderData);

      const { data: orderData_result, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        setError(`${t('error.failedToCreate')}: ${orderError.message}`);
        return;
      }

      // Create order items with notes and seat numbers
      const orderItemsData = orderItems.map(item => ({
        order_id: orderData_result.id,
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price,
        notes: item.notes ? `${item.notes}${item.seatNumber ? ` (${t('tables.seat')} ${item.seatNumber})` : ''}` : (item.seatNumber ? `${t('tables.seat')} ${item.seatNumber}` : null),
        status: 'pending'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        setError(`${t('error.failedToAddItems')}: ${itemsError.message}`);
        return;
      }

      setSuccess(`${t('success.orderCreated')} ${t('orders.orderNumber')}${orderData_result.id.slice(0, 8)}`);
      
      // Reset form
      setOrderItems([]);
      setCustomerName('');
      setTableNumber('');
      setSeatNumber('');

      // Close modal and refresh orders after a short delay
      setTimeout(() => {
        onOrderPlaced();
        onClose();
        setSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Error placing order:', error);
      setError(t('error.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const groupedItems = groupItemsByCategory();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('orders.newOrder')}</h2>
                <p className="opacity-90">
                  {prefilledTableNumber 
                    ? `${t('orders.createOrderForTable')} ${prefilledTableNumber}${prefilledSeatNumber ? `, ${t('tables.seat')} ${prefilledSeatNumber}` : ''}`
                    : t('orders.createNewOrderForTable')
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Menu Items Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('menu.availableMenuItems')}</h3>
            
            {loadingMenu ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="text-md font-medium text-gray-700 mb-3 border-b border-gray-200 pb-2">
                      {t(`category.${category}`) || category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-900">{item.name}</h5>
                            <span className="text-lg font-bold text-green-600">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedMenuItem(item)}
                              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              {t('menu.viewDetails')}
                            </button>
                            <button
                              onClick={() => addToOrder(item)}
                              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <Plus className="w-4 h-4" />
                              {t('common.add')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary Section */}
          <div className="w-96 bg-gray-50 p-6 border-l border-gray-200 flex flex-col max-h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('orders.orderSummary')}</h3>
            
            {/* Customer Info - Fixed at top */}
            <div className="space-y-4 mb-6 flex-shrink-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  {t('common.customer')} <span className="text-gray-500">({t('common.optional')} - {t('orders.autoGeneratesGuest')})</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('orders.enterCustomerName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {t('common.table')} #
                  </label>
                  <input
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder={t('common.table')}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('tables.seat')} #
                  </label>
                  <input
                    type="number"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    placeholder={t('tables.seat')}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Order Items - Scrollable */}
            <div className="flex-1 overflow-y-auto mb-6 min-h-0">
              <div className="pr-2"> {/* Add padding for scrollbar */}
                {orderItems.length > 0 ? (
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={`${item.menuItem.id}-${item.seatNumber}-${index}`} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h6 className="font-medium text-gray-900 text-sm">{item.menuItem.name}</h6>
                            {item.seatNumber && (
                              <p className="text-xs text-blue-600">{t('tables.seat')} {item.seatNumber}</p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-gray-500 italic">{item.notes}</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            ${(item.menuItem.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.seatNumber, item.quantity - 1)}
                              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.seatNumber, item.quantity + 1)}
                              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-xs text-gray-500">
                            ${item.menuItem.price.toFixed(2)} {t('orders.each')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">{t('orders.noItemsAdded')}</p>
                    <p className="text-gray-400 text-xs">{t('orders.selectItemsFromMenu')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Total - Fixed at bottom */}
            <div className="border-t border-gray-200 pt-4 mb-6 flex-shrink-0">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>{t('common.total')}:</span>
                <span className="text-green-600">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Messages - Fixed */}
            <div className="flex-shrink-0">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-green-700 text-sm">{success}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="space-y-3 flex-shrink-0">
              <button
                onClick={placeOrder}
                disabled={loading || orderItems.length === 0}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    {t('orders.createOrder')} (${calculateTotal().toFixed(2)})
                  </>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Item Detail Modal */}
      <MenuItemDetailModal
        isOpen={!!selectedMenuItem}
        onClose={() => setSelectedMenuItem(null)}
        menuItem={selectedMenuItem}
        onAddToOrder={addToOrder}
      />
    </div>
  );
}
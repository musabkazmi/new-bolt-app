import React, { useState, useEffect } from 'react';
import { 
  Clock, User, MapPin, DollarSign, AlertCircle, RefreshCw, Eye, 
  Edit, CheckCircle2, XCircle, Lock, Unlock, ShoppingCart, Plus
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, Order, OrderItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import OrderEditModal from './OrderEditModal';

interface OrderWithItems extends Order {
  order_items?: (OrderItem & { menu_item: any })[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Only load data if user exists
    if (user) {
      loadOrders();
    } else {
      // If no user, don't load data and stop loading
      setLoading(false);
    }
  }, [user, selectedStatus]);

  useEffect(() => {
    // Check if an order ID is specified in the URL
    const orderParam = searchParams.get('order');
    if (orderParam && orders.length > 0) {
      const order = orders.find(o => o.id === orderParam);
      if (order) {
        setEditingOrder(order);
      }
    }
  }, [searchParams, orders]);

  const loadOrders = async () => {
    if (!user) {
      setError('User not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('Loading orders for user:', user.id, 'role:', user.role);

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_item:menu_items (*)
          )
        `);

      // Apply role-based filtering (managers can see all orders)
      if (user.role !== 'manager') {
        switch (user.role) {
          case 'customer':
            query = query.eq('customer_id', user.id);
            break;
          case 'waiter':
            query = query.eq('waiter_id', user.id);
            break;
          case 'kitchen':
            // Kitchen staff can see all orders
            break;
          default:
            query = query.eq('customer_id', user.id);
        }
      }

      // Apply status filter if not 'all'
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching orders:', fetchError);
        setError(`Failed to load orders: ${fetchError.message}`);
        return;
      }

      console.log('Orders loaded:', data?.length || 0, 'orders');
      setOrders(data || []);

    } catch (err) {
      console.error('Error loading orders:', err);
      setError('An unexpected error occurred while loading orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      console.log('Updating order status:', orderId, 'to', newStatus);
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        setError('Failed to update order status');
        return;
      }

      // Reload orders to reflect the change
      await loadOrders();
      
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status');
    }
  };

  // Generate localized order number in format YYYY/DDD/NNN
  const generateLocalizedOrderNumber = async (order: Order) => {
    if (!order) return '';
    
    try {
      const orderDate = new Date(order.created_at);
      const year = orderDate.getFullYear();
      
      // Calculate day of year (1-366)
      const startOfYear = new Date(year, 0, 0);
      const dayOfYear = Math.floor((orderDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get all orders from the same day to determine sequence number
      const startOfDay = new Date(orderDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(orderDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data: dayOrders, error } = await supabase
        .from('orders')
        .select('id, created_at')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching day orders:', error);
        // Fallback to simple sequence based on order ID
        const orderSequence = parseInt(order.id.slice(-4), 16) % 999 + 1;
        return `${year}/${dayOfYear.toString().padStart(3, '0')}/${orderSequence.toString().padStart(3, '0')}`;
      }
      
      // Find the position of current order in the day's orders
      const orderIndex = dayOrders?.findIndex(o => o.id === order.id) ?? -1;
      const sequenceNumber = orderIndex >= 0 ? orderIndex + 1 : 1;
      
      return `${year}/${dayOfYear.toString().padStart(3, '0')}/${sequenceNumber.toString().padStart(3, '0')}`;
      
    } catch (error) {
      console.error('Error generating order number:', error);
      // Fallback format
      const date = new Date(order.created_at);
      const year = date.getFullYear();
      const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const orderSequence = parseInt(order.id.slice(-4), 16) % 999 + 1;
      
      return `${year}/${dayOfYear.toString().padStart(3, '0')}/${orderSequence.toString().padStart(3, '0')}`;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      served: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const canUpdateStatus = (order: Order) => {
    switch (user?.role) {
      case 'manager':
        return true;
      case 'waiter':
        return order.waiter_id === user.id;
      case 'kitchen':
        return ['pending', 'preparing'].includes(order.status);
      default:
        return false;
    }
  };

  const canEditOrder = (order: Order) => {
    // All orders can be edited since we removed payment status
    const hasPermission = user?.role === 'manager' || 
                         (user?.role === 'waiter' && order.waiter_id === user.id) ||
                         (user?.role === 'customer' && order.customer_id === user.id);
    
    return hasPermission;
  };

  const getNextStatus = (currentStatus: string, userRole: string) => {
    const statusFlow = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'served',
      served: 'completed'
    };

    if (userRole === 'kitchen' && currentStatus === 'ready') {
      return null; // Kitchen can't mark as served
    }

    return statusFlow[currentStatus as keyof typeof statusFlow];
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
          <p className="text-gray-500">Loading orders...</p>
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
            <h3 className="text-lg font-semibold text-red-800 mb-2">Orders Loading Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={loadOrders}
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
            {user?.role === 'customer' ? 'My Orders' : 
             user?.role === 'waiter' ? 'My Assigned Orders' : 
             'All Orders'}
          </h1>
          <p className="text-gray-600">
            {user?.role === 'customer' ? 'Track your order history and status' :
             user?.role === 'waiter' ? 'Manage orders assigned to you' :
             'Monitor and manage all restaurant orders'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {orders.length} orders found
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Order Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="served">Served</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const canEdit = canEditOrder(order);
            
            return (
              <OrderCard 
                key={order.id} 
                order={order} 
                canEdit={canEdit}
                canUpdateStatus={canUpdateStatus}
                getStatusColor={getStatusColor}
                getNextStatus={getNextStatus}
                updateOrderStatus={updateOrderStatus}
                setEditingOrder={setEditingOrder}
                generateLocalizedOrderNumber={generateLocalizedOrderNumber}
                user={user}
                t={t}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8">
            <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-4">
              {selectedStatus !== 'all'
                ? 'No orders match your current filters'
                : user?.role === 'customer' 
                  ? "You haven't placed any orders yet"
                  :  user?.role === 'waiter'
                    ? "No orders assigned to you"
                    : "No orders in the system"
              }
            </p>
            {selectedStatus !== 'all' && (
              <button
                onClick={() => setSelectedStatus('all')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      <OrderEditModal
        isOpen={!!editingOrder}
        onClose={() => {
          setEditingOrder(null);
          // Remove the order parameter from the URL
          if (searchParams.has('order')) {
            navigate('/orders');
          }
        }}
        order={editingOrder}
        onOrderUpdated={loadOrders}
      />
    </div>
  );
}

// Separate component for order cards to handle async order number generation
function OrderCard({ 
  order, 
  canEdit, 
  canUpdateStatus, 
  getStatusColor, 
  getNextStatus, 
  updateOrderStatus, 
  setEditingOrder, 
  generateLocalizedOrderNumber,
  user,
  t 
}: any) {
  const [localizedOrderNumber, setLocalizedOrderNumber] = useState('');

  useEffect(() => {
    generateLocalizedOrderNumber(order).then(setLocalizedOrderNumber);
  }, [order, generateLocalizedOrderNumber]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
              {order.table_number ? (
                <span className="font-bold text-green-600">
                  T{order.table_number}
                </span>
              ) : (
                <User className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('orders.orderNumber')}{localizedOrderNumber || order.id.slice(0, 8)}
                </h3>
                <Unlock className="w-4 h-4 text-green-600" title="Order editable" />
              </div>
              <p className="text-gray-600">
                {order.customer_name || 'Anonymous Order'}
              </p>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(order.created_at).toLocaleString()}
                </span>
                {order.table_number && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Table {order.table_number}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              €{typeof order.total === 'number' ? order.total.toFixed(2).replace('.', ',') : order.total}
            </p>
          </div>
        </div>

        {/* Order Items */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Order Items:</h4>
            <div className="space-y-2">
              {order.order_items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">
                      {item.quantity}x {item.menu_item?.name || 'Unknown Item'}
                    </span>
                    {item.notes && (
                      <p className="text-sm text-gray-600 italic">Note: {item.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">
                      €{typeof item.price === 'number' ? item.price.toFixed(2).replace('.', ',') : item.price}
                    </span>
                    <span className={`block text-xs px-2 py-1 rounded mt-1 ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {/* Edit Order Button */}
            {canEdit && (
              <button
                onClick={() => setEditingOrder(order)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Edit className="w-4 h-4" />
                Edit Order
              </button>
            )}

            {/* Status Update Button */}
            {canUpdateStatus(order) && getNextStatus(order.status, user?.role || '') && (
              <button
                onClick={() => updateOrderStatus(order.id, getNextStatus(order.status, user?.role || '') || '')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mark as {getNextStatus(order.status, user?.role || '')?.replace('_', ' ')}
              </button>
            )}

            {/* Manager Status Override */}
            {user?.role === 'manager' && (
              <select
                value={order.status}
                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">Served</option>
                <option value="completed">Completed</option>
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
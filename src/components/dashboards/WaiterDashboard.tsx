import React, { useState, useEffect } from 'react';
import { Clock, MapPin, CheckCircle, AlertCircle, Plus, Mic, Zap, Edit, ChevronRight, User, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, Order } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import NewOrderModal from '../NewOrderModal';
import VoiceOrderModal from '../VoiceOrderModal';
import QuickOrderModal from '../QuickOrderModal';

export default function WaiterDashboard() {
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showVoiceOrderModal, setShowVoiceOrderModal] = useState(false);
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Only load data if user exists and is a waiter
    if (user && user.role === 'waiter') {
      loadMyOrders();
    } else if (user) {
      // If user exists but not waiter, stop loading
      setLoading(false);
    }
  }, [user]);

  const loadMyOrders = async () => {
    if (!user || user.role !== 'waiter') {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('waiter_id', user.id)
        .in('status', ['pending', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading waiter orders:', error);
      } else {
        setMyOrders(data || []);
      }
    } catch (error) {
      console.error('Error loading waiter orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        return;
      }

      // Reload orders
      await loadMyOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleNewOrderPlaced = () => {
    // Refresh orders when a new order is placed
    loadMyOrders();
  };

  const handleOrderClick = (orderId: string) => {
    console.log('Order clicked:', orderId);
    // Navigate to orders page with the specific order highlighted
    navigate(`/orders?order=${orderId}`);
  };

  const handleTableClick = (tableNumber: number) => {
    // Navigate to table view with specific table selected
    navigate(`/tables?table=${tableNumber}`);
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
        return <AlertCircle className="w-4 h-4" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4" />;
      case 'served':
        return <CheckCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Mock table data - in a real app, this would come from a tables table
  const mockTables = [
    { id: '1', number: 1, seats: 2, status: 'available' },
    { id: '2', number: 2, seats: 4, status: 'available' },
    { id: '3', number: 3, seats: 4, status: 'occupied' },
    { id: '4', number: 4, seats: 6, status: 'available' },
    { id: '5', number: 5, seats: 2, status: 'occupied' },
    { id: '6', number: 6, seats: 4, status: 'reserved' },
    { id: '7', number: 7, seats: 6, status: 'occupied' },
    { id: '8', number: 8, seats: 8, status: 'available' }
  ];

  const activeTables = mockTables.filter(table => table.status === 'occupied');

  // Don't show loading if user is not logged in or not a waiter
  if (!user || user.role !== 'waiter') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('nav.dashboard')} - {t('role.waiter')}</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowQuickOrderModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Quick-Modus
          </button>
          <button 
            onClick={() => setShowVoiceOrderModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <Mic className="w-4 h-4" />
            {t('voice.title')}
          </button>
          <button 
            onClick={() => setShowNewOrderModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('orders.newOrder')}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('orders.title')}</p>
              <p className="text-2xl font-bold text-gray-900">{myOrders.length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('tables.title')}</p>
              <p className="text-2xl font-bold text-gray-900">{activeTables.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('orders.completed')}</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick-Modus Feature Highlight */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Zap className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Quick-Modus Sprachbestellung</h3>
            <p className="opacity-90 mb-4">
              Sprechen Sie Ihre Bestellung und lassen Sie das System automatisch eine Rechnung generieren und an Ihren Steuerberater senden.
            </p>
            <button 
              onClick={() => setShowQuickOrderModal(true)}
              className="bg-white text-emerald-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Quick-Modus starten
            </button>
          </div>
        </div>
      </div>

      {/* Active Orders - Enhanced Clickable Cards */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('orders.myOrders')}</h3>
        </div>
        <div className="p-6">
          {myOrders.length > 0 ? (
            <div className="space-y-4">
              {myOrders.map((order) => (
                <div 
                  key={order.id} 
                  onClick={() => handleOrderClick(order.id)}
                  className="group relative bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200 hover:border-green-300 rounded-xl p-6 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-600 text-white rounded-lg">
                        {order.table_number ? (
                          <span className="font-bold text-lg">T{order.table_number}</span>
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-green-800 transition-colors text-lg">
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
                      <span className="text-lg font-bold text-green-600">€{order.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Status Update Button */}
                      {order.status === 'ready' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            updateOrderStatus(order.id, 'served');
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        >
                          {t('orders.served')}
                        </button>
                      )}
                      
                      {/* Edit Indicator */}
                      <div className="flex items-center gap-2 text-green-600 group-hover:text-green-700 transition-colors">
                        <Edit className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('common.clickToEdit')}</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-green-600 bg-opacity-0 group-hover:bg-opacity-5 rounded-xl transition-all duration-200"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-green-50 rounded-xl p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">{t('dashboard.noOrders')}</h4>
                <p className="text-gray-500 mb-6 text-sm">
                  Keine Bestellungen zugewiesen. Erstellen Sie eine neue Bestellung oder warten Sie auf Zuweisungen.
                </p>
                <button 
                  onClick={() => setShowNewOrderModal(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  {t('orders.newOrder')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Status */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('tables.tableStatus')}</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mockTables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleTableClick(table.number)}
                className={`p-4 rounded-lg border-2 text-center cursor-pointer transition-all hover:scale-105 ${
                  table.status === 'available' ? 'border-green-200 bg-green-50 hover:bg-green-100' :
                  table.status === 'occupied' ? 'border-red-200 bg-red-50 hover:bg-red-100' :
                  'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                }`}
                title={`${t('common.clickToView')} ${t('tables.table')} ${table.number}`}
              >
                <div className="text-lg font-bold text-gray-900">T{table.number}</div>
                <div className="text-xs text-gray-600">{table.seats} {t('tables.seats')}</div>
                <div className={`text-xs font-medium mt-1 ${
                  table.status === 'available' ? 'text-green-600' :
                  table.status === 'occupied' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {t(`tables.${table.status}`).toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onOrderPlaced={handleNewOrderPlaced}
      />

      {/* Voice Order Modal */}
      <VoiceOrderModal
        isOpen={showVoiceOrderModal}
        onClose={() => setShowVoiceOrderModal(false)}
        onOrderPlaced={handleNewOrderPlaced}
      />

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={showQuickOrderModal}
        onClose={() => setShowQuickOrderModal(false)}
        onOrderPlaced={handleNewOrderPlaced}
      />
    </div>
  );
}
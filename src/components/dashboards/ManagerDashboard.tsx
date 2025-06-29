import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, ClipboardList, DollarSign, 
  Clock, CheckCircle, AlertTriangle, BarChart3, Mic, Plus, Zap, Settings
} from 'lucide-react';
import { supabase, Order } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import VoiceOrderModal from '../VoiceOrderModal';
import NewOrderModal from '../NewOrderModal';
import QuickOrderModal from '../QuickOrderModal';
import CompanySettingsModal from '../CompanySettingsModal';

interface CompanyData {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  vatId: string;
}

export default function ManagerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoiceOrderModal, setShowVoiceOrderModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayOrders: 0,
    activeStaff: 8, // This would come from a staff query
    avgOrderTime: 22 // This would be calculated from order data
  });
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    // Only load data if user exists and is a manager
    if (user && user.role === 'manager') {
      loadDashboardData();
    } else if (user) {
      // If user exists but not manager, stop loading
      setLoading(false);
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user || user.role !== 'manager') {
      setLoading(false);
      return;
    }

    try {
      // Load today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
      } else {
        setOrders(ordersData || []);
        
        // Calculate stats
        const totalRevenue = ordersData?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
        const todayOrders = ordersData?.length || 0;
        
        setStats(prev => ({
          ...prev,
          totalRevenue,
          todayOrders
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderPlaced = () => {
    // Refresh dashboard data when a new order is placed
    loadDashboardData();
  };

  const handleCompanyDataSave = (companyData: CompanyData) => {
    console.log('Company data saved:', companyData);
    setShowCompanySettings(false);
  };

  const recentActivity = [
    { id: '1', action: t('dashboard.newVoiceOrderReceived'), time: t('dashboard.2MinutesAgo'), type: 'order' },
    { id: '2', action: t('dashboard.staffMemberClockedIn'), time: t('dashboard.15MinutesAgo'), type: 'staff' },
    { id: '3', action: t('dashboard.orderCompleted'), time: t('dashboard.20MinutesAgo'), type: 'complete' },
    { id: '4', action: t('dashboard.inventoryLowAlert'), time: t('dashboard.1HourAgo'), type: 'alert' },
  ];

  // Don't show loading if user is not logged in or not a manager
  if (!user || user.role !== 'manager') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.managerDashboard')}</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString(undefined, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <button 
            onClick={() => setShowCompanySettings(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Firmeneinstellungen
          </button>
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
            <div className="flex gap-3">
              <button 
                onClick={() => setShowQuickOrderModal(true)}
                className="bg-white text-emerald-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Quick-Modus starten
              </button>
              <div className="text-sm opacity-90 flex items-center">
                <span className="bg-white/20 px-2 py-1 rounded text-xs mr-2">NEU</span>
                Mit DATEV-Export
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.todaysRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">€{stats.totalRevenue.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12.5%</span>
            <span className="text-gray-500 ml-1">vs gestern</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.ordersToday')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <ClipboardList className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Spitze: 12-14 Uhr</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.activeStaff')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeStaff}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">3 Küche • 5 Service</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.avgOrderTime')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgOrderTime}m</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">Im Ziel</span>
          </div>
        </div>
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.salesTrend')}</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[65, 45, 80, 55, 90, 75, 85].map((height, index) => (
              <div key={index} className="flex-1 bg-blue-100 rounded-t relative">
                <div 
                  className="bg-blue-500 rounded-t w-full transition-all duration-500"
                  style={{ height: `${height}%` }}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Mo</span>
            <span>Di</span>
            <span>Mi</span>
            <span>Do</span>
            <span>Fr</span>
            <span>Sa</span>
            <span>So</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentActivity')}</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  activity.type === 'order' ? 'bg-blue-50' :
                  activity.type === 'staff' ? 'bg-green-50' :
                  activity.type === 'complete' ? 'bg-purple-50' : 'bg-red-50'
                }`}>
                  {activity.type === 'order' && <ClipboardList className="w-4 h-4 text-blue-600" />}
                  {activity.type === 'staff' && <Users className="w-4 h-4 text-green-600" />}
                  {activity.type === 'complete' && <CheckCircle className="w-4 h-4 text-purple-600" />}
                  {activity.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentOrders')}</h3>
        </div>
        <div className="p-6">
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                      <span className="text-blue-600 font-bold">
                        {order.table_number ? `T${order.table_number}` : '#'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{order.customer_name}</h4>
                      <p className="text-sm text-gray-500">
                        {t('orders.orderNumber')}{order.id.slice(0, 8)} • €{order.total.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'ready' ? 'bg-green-100 text-green-800' :
                      order.status === 'served' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {t(`orders.${order.status}`).toUpperCase()}
                    </span>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('dashboard.noOrders')}</p>
          )}
        </div>
      </div>

      {/* Voice Order Modal */}
      <VoiceOrderModal
        isOpen={showVoiceOrderModal}
        onClose={() => setShowVoiceOrderModal(false)}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={showQuickOrderModal}
        onClose={() => setShowQuickOrderModal(false)}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Company Settings Modal */}
      <CompanySettingsModal
        isOpen={showCompanySettings}
        onClose={() => setShowCompanySettings(false)}
        onSave={handleCompanyDataSave}
      />
    </div>
  );
}
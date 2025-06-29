import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, DollarSign, TrendingUp, TrendingDown, 
  FileText, Download, Filter, RefreshCw, AlertCircle,
  BarChart3, PieChart, Users, ShoppingBag
} from 'lucide-react';
import { supabase, Order } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BillSummary {
  date: string;
  time: string;
  billNumber: string;
  customerName: string;
  tableNumber?: number;
  total: number;
  status: string;
  itemCount: number;
}

interface DailySummary {
  date: string;
  billCount: number;
  totalRevenue: number;
  averageBill: number;
}

export default function SalesReport() {
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
    endDate: new Date().toISOString().split('T')[0]
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    totalBills: 0,
    totalRevenue: 0,
    averageBill: 0,
    todayBills: 0,
    todayRevenue: 0,
    growthRate: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'manager') {
      loadSalesData();
    } else if (user) {
      setLoading(false);
    }
  }, [user, dateRange, statusFilter]);

  const loadSalesData = async () => {
    if (!user || user.role !== 'manager') {
      setError('Access denied. Manager role required.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Loading sales data for date range:', dateRange);

      // Build query with date range
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_item:menu_items (name)
          )
        `)
        .gte('created_at', `${dateRange.startDate}T00:00:00.000Z`)
        .lte('created_at', `${dateRange.endDate}T23:59:59.999Z`)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        setError(`Failed to load sales data: ${ordersError.message}`);
        return;
      }

      console.log('Orders loaded:', ordersData?.length || 0);

      // Transform orders into bill summaries
      const billSummaries: BillSummary[] = (ordersData || []).map((order, index) => {
        const orderDate = new Date(order.created_at);
        const itemCount = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
        
        return {
          date: orderDate.toLocaleDateString(),
          time: orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          billNumber: `#${order.id.slice(0, 8)}`,
          customerName: order.customer_name,
          tableNumber: order.table_number,
          total: Number(order.total),
          status: order.status,
          itemCount
        };
      });

      setBills(billSummaries);

      // Calculate daily summaries
      const dailyMap = new Map<string, { bills: BillSummary[], revenue: number }>();
      
      billSummaries.forEach(bill => {
        if (!dailyMap.has(bill.date)) {
          dailyMap.set(bill.date, { bills: [], revenue: 0 });
        }
        const dayData = dailyMap.get(bill.date)!;
        dayData.bills.push(bill);
        dayData.revenue += bill.total;
      });

      const dailySummariesData: DailySummary[] = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          billCount: data.bills.length,
          totalRevenue: data.revenue,
          averageBill: data.revenue / data.bills.length
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setDailySummaries(dailySummariesData);

      // Calculate overall stats
      const totalBills = billSummaries.length;
      const totalRevenue = billSummaries.reduce((sum, bill) => sum + bill.total, 0);
      const averageBill = totalBills > 0 ? totalRevenue / totalBills : 0;

      // Today's stats
      const today = new Date().toLocaleDateString();
      const todayBills = billSummaries.filter(bill => bill.date === today);
      const todayRevenue = todayBills.reduce((sum, bill) => sum + bill.total, 0);

      // Calculate growth rate (compare with previous period)
      const periodDays = Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24));
      const previousStartDate = new Date(new Date(dateRange.startDate).getTime() - periodDays * 24 * 60 * 60 * 1000);
      const previousEndDate = new Date(dateRange.startDate);

      const { data: previousData } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      const previousRevenue = previousData?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      setStats({
        totalBills,
        totalRevenue,
        averageBill,
        todayBills: todayBills.length,
        todayRevenue,
        growthRate
      });

    } catch (err) {
      console.error('Error loading sales data:', err);
      setError('An unexpected error occurred while loading sales data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Bill Number', 'Customer', 'Table', 'Items', 'Total', 'Status'];
    const csvContent = [
      headers.join(','),
      ...bills.map(bill => [
        bill.date,
        bill.time,
        bill.billNumber,
        `"${bill.customerName}"`,
        bill.tableNumber || 'N/A',
        bill.itemCount,
        bill.total.toFixed(2),
        bill.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Redirect if not manager
  if (user && user.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">Only managers can access sales reports.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading sales report...</p>
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
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Report</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={loadSalesData}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Report</h1>
          <p className="text-gray-600">Comprehensive overview of bills and revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSalesData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBills}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Today: {stats.todayBills} bills</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Today: ${stats.todayRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Bill</p>
              <p className="text-2xl font-bold text-gray-900">${stats.averageBill.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Per transaction</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.growthRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              {stats.growthRate >= 0 ? (
                <TrendingUp className="w-6 h-6 text-orange-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-orange-600" />
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={`${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              vs previous period
            </span>
          </div>
        </div>
      </div>

      {/* Daily Summary Chart */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Daily Revenue Trend</h3>
        </div>
        <div className="p-6">
          {dailySummaries.length > 0 ? (
            <div className="h-64 flex items-end justify-between space-x-2">
              {dailySummaries.map((day, index) => {
                const maxRevenue = Math.max(...dailySummaries.map(d => d.totalRevenue));
                const height = maxRevenue > 0 ? (day.totalRevenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-blue-100 rounded-t relative group cursor-pointer">
                      <div 
                        className="bg-blue-500 rounded-t w-full transition-all duration-500 hover:bg-blue-600"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      ></div>
                      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.date}<br/>
                        ${day.totalRevenue.toFixed(2)}<br/>
                        {day.billCount} bills
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No data available for the selected period
            </div>
          )}
        </div>
      </div>

      {/* Bills Overview Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Bills Overview</h3>
            <span className="text-sm text-gray-500">{bills.length} bills found</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {bills.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bills.map((bill, index) => (
                  <tr key={`${bill.billNumber}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{bill.date}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {bill.time}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">{bill.billNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{bill.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bill.tableNumber ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Table {bill.tableNumber}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShoppingBag className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{bill.itemCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">${bill.total.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bill.status === 'completed' ? 'bg-green-100 text-green-800' :
                        bill.status === 'served' ? 'bg-purple-100 text-purple-800' :
                        bill.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                        bill.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bill.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No bills found</h3>
              <p className="text-gray-500">
                No bills match your current filters. Try adjusting the date range or status filter.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
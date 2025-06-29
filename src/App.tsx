import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ManualPasswordReset from './components/ManualPasswordReset';
import Dashboard from './components/Dashboard';
import MenuPage from './components/MenuPage';
import OrdersPage from './components/OrdersPage';
import AIAgent from './components/AIAgent';
import AddMenuItem from './components/AddMenuItem';
import SalesReport from './components/SalesReport';
import TableView from './components/TableView';
import QuickOrderModal from './components/QuickOrderModal';
import DrinkOrdersPage from './components/DrinkOrdersPage';
import BarMenuPage from './components/BarMenuPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [showQuickOrder, setShowQuickOrder] = React.useState(false);

  // Show loading only during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading RestaurantOS</h2>
          <p className="text-gray-600">Setting up your restaurant management system...</p>
        </div>
      </div>
    );
  }

  // If no user, show login/auth routes
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/manual-reset" element={<ManualPasswordReset />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/add-menu-item" element={<AddMenuItem />} />
        <Route path="/staff" element={<div className="p-8 text-center text-gray-500">Staff overview coming soon...</div>} />
        <Route path="/reports" element={<SalesReport />} />
        <Route path="/take-order" element={<div className="p-8 text-center text-gray-500">Take order page coming soon...</div>} />
        <Route path="/quick-order" element={
          <div className="p-8">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Quick-Modus Sprachbestellung</h1>
              <p className="text-gray-600 mb-8">Sprechen Sie Ihre Bestellung und lassen Sie das System automatisch eine Rechnung generieren und versenden.</p>
              <button
                onClick={() => setShowQuickOrder(true)}
                className="bg-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Quick-Modus starten
              </button>
            </div>
            <QuickOrderModal
              isOpen={showQuickOrder}
              onClose={() => setShowQuickOrder(false)}
              onOrderPlaced={() => {
                setShowQuickOrder(false);
                // Refresh or redirect as needed
              }}
            />
          </div>
        } />
        <Route path="/tables" element={<TableView />} />
        <Route path="/my-orders" element={<OrdersPage />} />
        <Route path="/pending-orders" element={
          user.role === 'bar' ? <DrinkOrdersPage /> : <OrdersPage />
        } />
        <Route path="/bar-menu" element={<BarMenuPage />} />
        <Route path="/completed" element={<div className="p-8 text-center text-gray-500">Completed dishes coming soon...</div>} />
        <Route path="/inventory" element={<div className="p-8 text-center text-gray-500">Inventory view coming soon...</div>} />
        <Route path="/cart" element={<div className="p-8 text-center text-gray-500">Cart/checkout coming soon...</div>} />
        <Route path="/ai" element={<AIAgent />} />
        <Route path="/manual-reset" element={<ManualPasswordReset />} />
        
        {/* Auth routes should redirect to dashboard if user is logged in */}
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/dashboard" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
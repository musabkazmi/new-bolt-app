import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Home, ClipboardList, Users, BarChart3, Bot,
  ShoppingCart, Eye, FileText, ChefHat, Package,
  Menu, ShoppingBag, User, Zap, Wine
} from 'lucide-react';

const navigationItems = {
  manager: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/orders', icon: ClipboardList, labelKey: 'nav.ordersOverview' },
    { path: '/menu', icon: Menu, labelKey: 'nav.menuManagement' },
    { path: '/take-order', icon: ShoppingCart, labelKey: 'nav.takeOrder' },
    { path: '/quick-order', icon: Zap, labelKey: 'nav.quickOrder' },
    { path: '/tables', icon: Eye, labelKey: 'nav.tableView' },
    { path: '/staff', icon: Users, labelKey: 'nav.staffOverview' },
    { path: '/reports', icon: BarChart3, labelKey: 'nav.salesReports' },
    { path: '/pending-orders', icon: ClipboardList, labelKey: 'nav.pendingOrders' },
    { path: '/completed', icon: ChefHat, labelKey: 'nav.completedDishes' },
    { path: '/inventory', icon: Package, labelKey: 'nav.inventoryView' },
    { path: '/cart', icon: ShoppingBag, labelKey: 'nav.cartCheckout' },
    { path: '/ai', icon: Bot, labelKey: 'nav.aiAgent' },
  ],
  waiter: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/take-order', icon: ShoppingCart, labelKey: 'nav.takeOrder' },
    { path: '/quick-order', icon: Zap, labelKey: 'nav.quickOrder' },
    { path: '/tables', icon: Eye, labelKey: 'nav.tableView' },
    { path: '/my-orders', icon: FileText, labelKey: 'nav.myOrders' },
    { path: '/ai', icon: Bot, labelKey: 'nav.aiAgent' },
  ],
  kitchen: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/pending-orders', icon: ClipboardList, labelKey: 'nav.pendingOrders' },
    { path: '/completed', icon: ChefHat, labelKey: 'nav.completedDishes' },
    { path: '/inventory', icon: Package, labelKey: 'nav.inventoryView' },
    { path: '/ai', icon: Bot, labelKey: 'nav.aiAgent' },
  ],
  bar: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/pending-orders', icon: Wine, labelKey: 'nav.drinkOrders' },
    { path: '/completed', icon: ChefHat, labelKey: 'nav.completedDrinks' },
    { path: '/inventory', icon: Package, labelKey: 'nav.barInventory' },
    { path: '/ai', icon: Bot, labelKey: 'nav.aiAgent' },
  ],
  customer: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/menu', icon: Menu, labelKey: 'nav.browseMenu' },
    { path: '/orders', icon: ShoppingBag, labelKey: 'nav.myOrders' },
    { path: '/cart', icon: ShoppingCart, labelKey: 'nav.cartCheckout' },
    { path: '/ai', icon: Bot, labelKey: 'nav.aiAgent' },
  ],
};

export default function Navigation() {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  if (!user) return null;

  const items = navigationItems[user.role] || [];

  const getRoleColors = (role: string) => {
    const colors = {
      manager: {
        active: 'text-blue-700 bg-blue-100 border-l-4 border-blue-600 shadow-md',
        hover: 'hover:text-blue-600 hover:bg-blue-50',
        inactive: 'text-gray-600'
      },
      waiter: {
        active: 'text-green-700 bg-green-100 border-l-4 border-green-600 shadow-md',
        hover: 'hover:text-green-600 hover:bg-green-50',
        inactive: 'text-gray-600'
      },
      kitchen: {
        active: 'text-orange-700 bg-orange-100 border-l-4 border-orange-600 shadow-md',
        hover: 'hover:text-orange-600 hover:bg-orange-50',
        inactive: 'text-gray-600'
      },
      bar: {
        active: 'text-pink-700 bg-pink-100 border-l-4 border-pink-600 shadow-md',
        hover: 'hover:text-pink-600 hover:bg-pink-50',
        inactive: 'text-gray-600'
      },
      customer: {
        active: 'text-purple-700 bg-purple-100 border-l-4 border-purple-600 shadow-md',
        hover: 'hover:text-purple-600 hover:bg-purple-50',
        inactive: 'text-gray-600'
      }
    };
    return colors[role as keyof typeof colors] || colors.customer;
  };

  const roleColors = getRoleColors(user.role);

  return (
    <nav className="p-4">
      <div className="space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 transform ${
                isActive
                  ? `${roleColors.active} font-semibold scale-105`
                  : `${roleColors.inactive} ${roleColors.hover} hover:scale-102`
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                <span className="relative">
                  {t(item.labelKey)}
                  {isActive && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-current rounded-full"></div>
                  )}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* Role Indicator */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            user.role === 'manager' ? 'bg-blue-500' :
            user.role === 'waiter' ? 'bg-green-500' :
            user.role === 'kitchen' ? 'bg-orange-500' :
            user.role === 'bar' ? 'bg-pink-500' :
            'bg-purple-500'
          }`}></div>
          <span className="text-sm font-medium text-gray-700">
            {user.role === 'bar' ? 'Bar Staff' : t(`role.${user.role}`)}
          </span>
        </div>
      </div>
    </nav>
  );
}
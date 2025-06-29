import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Home, ClipboardList, Users, BarChart3, Bot,
  ShoppingCart, Eye, FileText, ChefHat, Package,
  Menu, ShoppingBag, Mic, Zap, Wine, BookOpen
} from 'lucide-react';

const navigationItems = {
  manager: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/orders', icon: ClipboardList, labelKey: 'nav.orders' },
    { path: '/quick-order', icon: Zap, labelKey: 'nav.quick' },
    { path: '/menu', icon: Menu, labelKey: 'nav.menu' },
    { path: '/ai', icon: Bot, labelKey: 'nav.ai' },
  ],
  waiter: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/take-order', icon: ShoppingCart, labelKey: 'nav.order' },
    { path: '/quick-order', icon: Zap, labelKey: 'nav.quick' },
    { path: '/tables', icon: Eye, labelKey: 'nav.tables' },
    { path: '/ai', icon: Bot, labelKey: 'nav.ai' },
  ],
  kitchen: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/pending-orders', icon: ClipboardList, labelKey: 'nav.pending' },
    { path: '/inventory', icon: Package, labelKey: 'nav.stock' },
    { path: '/ai', icon: Bot, labelKey: 'nav.ai' },
  ],
  bar: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/pending-orders', icon: Wine, labelKey: 'nav.drinks' },
    { path: '/bar-menu', icon: BookOpen, labelKey: 'nav.menu' },
    { path: '/ai', icon: Bot, labelKey: 'nav.ai' },
  ],
  customer: [
    { path: '/dashboard', icon: Home, labelKey: 'nav.home' },
    { path: '/menu', icon: Menu, labelKey: 'nav.menu' },
    { path: '/orders', icon: ShoppingBag, labelKey: 'nav.orders' },
    { path: '/cart', icon: ShoppingCart, labelKey: 'nav.cart' },
    { path: '/ai', icon: Bot, labelKey: 'nav.ai' },
  ],
};

export default function MobileNavigation() {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  if (!user) return null;

  const items = navigationItems[user.role] || [];

  const getRoleColors = (role: string) => {
    const colors = {
      manager: {
        active: 'text-blue-700 bg-blue-100',
        activeIndicator: 'bg-blue-600',
        inactive: 'text-gray-400'
      },
      waiter: {
        active: 'text-green-700 bg-green-100',
        activeIndicator: 'bg-green-600',
        inactive: 'text-gray-400'
      },
      kitchen: {
        active: 'text-orange-700 bg-orange-100',
        activeIndicator: 'bg-orange-600',
        inactive: 'text-gray-400'
      },
      bar: {
        active: 'text-pink-700 bg-pink-100',
        activeIndicator: 'bg-pink-600',
        inactive: 'text-gray-400'
      },
      customer: {
        active: 'text-purple-700 bg-purple-100',
        activeIndicator: 'bg-purple-600',
        inactive: 'text-gray-400'
      }
    };
    return colors[role as keyof typeof colors] || colors.customer;
  };

  const roleColors = getRoleColors(user.role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 shadow-lg">
      <div className="flex justify-around">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? `${roleColors.active} font-semibold transform scale-105`
                  : `${roleColors.inactive} hover:text-gray-600`
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active Indicator Dot */}
                {isActive && (
                  <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 ${roleColors.activeIndicator} rounded-full animate-pulse`}></div>
                )}
                
                <item.icon className={`w-5 h-5 ${isActive ? 'animate-bounce' : ''}`} />
                <span className="text-xs">{t(item.labelKey)}</span>
                
                {/* Active Underline */}
                {isActive && (
                  <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 ${roleColors.activeIndicator} rounded-full`}></div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* Role Indicator Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        user.role === 'manager' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
        user.role === 'waiter' ? 'bg-gradient-to-r from-green-400 to-green-600' :
        user.role === 'kitchen' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
        user.role === 'bar' ? 'bg-gradient-to-r from-pink-400 to-pink-600' :
        'bg-gradient-to-r from-purple-400 to-purple-600'
      }`}></div>
    </nav>
  );
}
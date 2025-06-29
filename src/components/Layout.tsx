import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Navigation from './Navigation';
import MobileNavigation from './MobileNavigation';
import LanguageSelector from './LanguageSelector';
import { LogOut, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const getRoleColor = (role: string) => {
    const colors = {
      manager: 'from-blue-500 to-blue-600',
      waiter: 'from-green-500 to-green-600',
      kitchen: 'from-orange-500 to-orange-600',
      customer: 'from-purple-500 to-purple-600',
      bar: 'from-pink-500 to-pink-600'
    };
    return colors[role as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      manager: t('role.manager'),
      waiter: t('role.waiter'),
      kitchen: t('role.kitchen'),
      customer: t('role.customer'),
      bar: 'Bar Staff'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const handleLogout = async () => {
    try {
      console.log('Logout button clicked');
      
      // Show immediate feedback to user
      const logoutButton = document.querySelector('[data-logout-button]') as HTMLButtonElement;
      if (logoutButton) {
        logoutButton.disabled = true;
        logoutButton.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
      }
      
      await signOut();
      console.log('Logout completed');
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Reset button state on error
      const logoutButton = document.querySelector('[data-logout-button]') as HTMLButtonElement;
      if (logoutButton) {
        logoutButton.disabled = false;
        logoutButton.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg><span class="hidden sm:block text-sm">Logout</span>';
      }
      
      // Force reload as fallback
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleNotificationClick = () => {
    console.log('Notification bell clicked');
    // Add notification functionality here
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`bg-gradient-to-r ${getRoleColor(user.role)} text-white shadow-lg`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{t('auth.title')}</h1>
            <span className="text-sm opacity-80 capitalize">• {getRoleLabel(user.role)}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm opacity-90">
              {t('common.welcome')}, {user.name}
            </span>
            
            {/* Language Selector */}
            <LanguageSelector variant="compact" />
            
            <button 
              onClick={handleNotificationClick}
              className="relative p-2 rounded-lg hover:bg-black/20 transition-colors"
            >
              <Bell className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full"></span>
            </button>
            
            <button
              onClick={handleLogout}
              data-logout-button
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block text-sm">{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 bg-white shadow-lg min-h-screen">
          <Navigation />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 pb-20 lg:pb-4">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <MobileNavigation />
      </div>
    </div>
  );
}
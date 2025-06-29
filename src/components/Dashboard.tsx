import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ManagerDashboard from './dashboards/ManagerDashboard';
import WaiterDashboard from './dashboards/WaiterDashboard';
import KitchenDashboard from './dashboards/KitchenDashboard';
import CustomerDashboard from './dashboards/CustomerDashboard';
import BarDashboard from './dashboards/BarDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const dashboards = {
    manager: ManagerDashboard,
    waiter: WaiterDashboard,
    kitchen: KitchenDashboard,
    customer: CustomerDashboard,
    bar: BarDashboard,
  };

  const DashboardComponent = dashboards[user.role];

  return <DashboardComponent />;
}
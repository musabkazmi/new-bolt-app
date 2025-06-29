export type UserRole = 'manager' | 'waiter' | 'kitchen' | 'customer' | 'bar';

// Legacy types for compatibility
export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface Order {
  id: string;
  tableNumber?: number;
  customerName: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed';
  total: number;
  timestamp: string;
  waiterId?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready';
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved';
  currentOrder?: string;
}
import { createClient } from '@supabase/supabase-js';

// Hardcode the Supabase configuration for deployment reliability
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ungvhpjmntrxnyvdtjqr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZ3ZocGptbnRyeG55dmR0anFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTY0MjUsImV4cCI6MjA2NjI5MjQyNX0.laTArnBd924f4au9nN7LjL3eFUAGHHMvOjuP7-RR1xI';

// Validate that we have the required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing:', { 
    url: !!supabaseUrl, 
    key: !!supabaseAnonKey 
  });
  throw new Error('Missing Supabase environment variables');
}

// Log configuration status (without exposing sensitive data)
console.log('Supabase configuration loaded:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey.length,
  environment: import.meta.env.MODE
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface User {
  id: string;
  email: string;
  role: 'manager' | 'waiter' | 'kitchen' | 'customer' | 'bar';
  name: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  available: boolean;
  created_at: string;
  // Extended fields for detailed view
  ingredients?: string[];
  allergens?: string[];
  preparation_time?: number;
  calories?: number;
  dietary_info?: string[];
}

export interface Order {
  id: string;
  customer_id: string;
  waiter_id?: string;
  table_number?: number;
  customer_name?: string; // Made optional
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed';
  total: number;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready';
  menu_item?: MenuItem;
  created_at?: string;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  type: 'user' | 'assistant';
  created_at: string;
}
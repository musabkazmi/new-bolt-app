import { supabase } from './supabase';

export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const aiQueries = {
  // Get the cheapest menu item
  getCheapestMenuItem: async (): Promise<QueryResult> => {
    try {
      console.log('Fetching cheapest menu item...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const { data, error } = await supabase
        .from('menu_items')
        .select('name, price, category, description')
        .eq('available', true)
        .order('price', { ascending: true })
        .limit(1)
        .single();

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching cheapest item:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No menu items found' };
      }

      console.log('Cheapest item found:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getCheapestMenuItem:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: 'Database query timed out' };
      }
      return { success: false, error: 'Failed to fetch cheapest menu item' };
    }
  },

  // Get the most expensive menu item
  getMostExpensiveMenuItem: async (): Promise<QueryResult> => {
    try {
      console.log('Fetching most expensive menu item...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from('menu_items')
        .select('name, price, category, description')
        .eq('available', true)
        .order('price', { ascending: false })
        .limit(1)
        .single();

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching most expensive item:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No menu items found' };
      }

      console.log('Most expensive item found:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getMostExpensiveMenuItem:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: 'Database query timed out' };
      }
      return { success: false, error: 'Failed to fetch most expensive menu item' };
    }
  },

  // Get all menu items by category
  getMenuItemsByCategory: async (category: string): Promise<QueryResult> => {
    try {
      console.log('Fetching menu items by category:', category);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from('menu_items')
        .select('name, price, category, description')
        .eq('available', true)
        .ilike('category', `%${category}%`)
        .order('price', { ascending: true })
        .limit(10); // Limit results to prevent large responses

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching items by category:', error);
        return { success: false, error: error.message };
      }

      console.log('Items by category found:', data?.length || 0);
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error in getMenuItemsByCategory:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: 'Database query timed out' };
      }
      return { success: false, error: 'Failed to fetch menu items by category' };
    }
  },

  // Get pending orders count
  getPendingOrdersCount: async (): Promise<QueryResult> => {
    try {
      console.log('Fetching pending orders count...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching pending orders:', error);
        return { success: false, error: error.message };
      }

      console.log('Pending orders count:', count);
      return { success: true, data: { count: count || 0 } };
    } catch (error: any) {
      console.error('Error in getPendingOrdersCount:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: 'Database query timed out' };
      }
      return { success: false, error: 'Failed to fetch pending orders count' };
    }
  },

  // Get today's revenue
  getTodayRevenue: async (): Promise<QueryResult> => {
    try {
      console.log('Fetching today\'s revenue...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', today.toISOString())
        .in('status', ['completed', 'served'])
        .limit(100); // Limit to prevent large queries

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching today\'s revenue:', error);
        return { success: false, error: error.message };
      }

      const totalRevenue = data?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      
      console.log('Today\'s revenue:', totalRevenue);
      return { success: true, data: { revenue: totalRevenue, orderCount: data?.length || 0 } };
    } catch (error: any) {
      console.error('Error in getTodayRevenue:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: 'Database query timed out' };
      }
      return { success: false, error: 'Failed to fetch today\'s revenue' };
    }
  },

  // Get menu categories
  getMenuCategories: async (): Promise<QueryResult> => {
    try {
      console.log('Fetching menu categories...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from('menu_items')
        .select('category')
        .eq('available', true)
        .limit(50); // Limit to prevent large queries

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching categories:', error);
        return { success: false, error: error.message };
      }

      const categories = [...new Set(data?.map(item => item.category) || [])];
      
      console.log('Categories found:', categories);
      return { success: true, data: categories };
    } catch (error: any) {
      console.error('Error in getMenuCategories:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: 'Database query timed out' };
      }
      return { success: false, error: 'Failed to fetch menu categories' };
    }
  }
};
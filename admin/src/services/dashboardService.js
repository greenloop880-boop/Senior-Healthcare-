import { supabase } from '../supabase/client';

export const dashboardService = {
  // 1. Get Top KPIs
  async getMetrics() {
    // Total Inventory Value
    const { data: invData, error: invError } = await supabase
      .from('inventory_summary')
      .select('inventory_value');
    if (invError) throw invError;
    const totalInventoryValue = invData?.reduce((sum, item) => sum + (Number(item.inventory_value) || 0), 0) || 0;

    // Total Sales & Profit (All Time or could be filtered by date)
    const { data: salesData, error: salesError } = await supabase
      .from('sales_summary')
      .select('revenue, profit, orders');
    if (salesError) throw salesError;
    const totalRevenue = salesData?.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0) || 0;
    const totalProfit = salesData?.reduce((sum, item) => sum + (Number(item.profit) || 0), 0) || 0;
    const totalOrders = salesData?.reduce((sum, item) => sum + (Number(item.orders) || 0), 0) || 0;

    // Pending Orders count (where status is PENDING or PROCESSING)
    const { count: pendingCount, error: pendingError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PENDING', 'PROCESSING']);
    if (pendingError) throw pendingError;

    return {
      total_sales: totalRevenue,
      total_profit: totalProfit,
      total_orders: totalOrders,
      pending_orders: pendingCount || 0,
      inventory_value: totalInventoryValue
    };
  },

  // 2. Get Sales Trend (Daily)
  async getSalesTrend() {
    const { data, error } = await supabase
      .from('sales_summary')
      .select('*')
      .order('date', { ascending: false })
      .limit(14); // Last 14 days of activity
    
    if (error) throw error;
    // Reverse to ascending for charting
    return data.reverse();
  },

  // 3. Get Top Performing Products
  async getTopProducts() {
    const { data, error } = await supabase
      .from('product_performance')
      .select('*')
      .order('revenue', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    return data;
  },

  // 4. Get Low Stock Items
  async getLowStockItems() {
    // We can join inventory_summary and skus
    const { data, error } = await supabase
      .from('inventory_summary')
      .select(`
        sku_id,
        sku_code,
        available_stock,
        skus ( reorder_level, products ( name ) )
      `);
      
    if (error) throw error;
    
    // Filter locally since postgREST doesn't easily let us compare two columns across a join without an RPC or View
    const lowStock = data.filter(item => {
      const reorderLevel = item.skus?.reorder_level || 0;
      return item.available_stock <= reorderLevel;
    });

    // Sort by most critical
    return lowStock.sort((a, b) => a.available_stock - b.available_stock).slice(0, 10);
  }
};

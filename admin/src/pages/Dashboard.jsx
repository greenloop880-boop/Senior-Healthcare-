import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard_metrics'],
    queryFn: () => dashboardService.getMetrics()
  });

  const { data: salesTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['sales_trend'],
    queryFn: () => dashboardService.getSalesTrend()
  });

  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ['top_products'],
    queryFn: () => dashboardService.getTopProducts()
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ['low_stock'],
    queryFn: () => dashboardService.getLowStockItems()
  });

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="dashboard">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h2>Analytics Command Center</h2>
        <p style={{ color: '#64748b' }}>Live data from ERP SQL Views</p>
      </div>

      {/* KPI WIDGETS */}
      <div className="dashboard-widgets" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="widget" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Total Revenue</h4>
          {metricsLoading ? <div>Loading...</div> : (
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(metrics?.total_sales)}</div>
          )}
        </div>
        <div className="widget" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Gross Profit</h4>
          {metricsLoading ? <div>Loading...</div> : (
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(metrics?.total_profit)}</div>
          )}
        </div>
        <div className="widget" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Total Orders</h4>
          {metricsLoading ? <div>Loading...</div> : (
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{metrics?.total_orders}</div>
          )}
        </div>
        <div className="widget" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Total Inventory Value</h4>
          {metricsLoading ? <div>Loading...</div> : (
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(metrics?.inventory_value)}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN */}
        <div>
          {/* SALES TREND CHART (Simple HTML/CSS implementation for demonstration) */}
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Sales & Profit Trend (Last 14 Active Days)</h3>
            {trendLoading ? <p>Loading chart...</p> : (
              <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                {salesTrend?.length > 0 ? salesTrend.map((day, idx) => {
                  const maxRevenue = Math.max(...salesTrend.map(d => Number(d.revenue)));
                  const revenueHeight = maxRevenue > 0 ? (Number(day.revenue) / maxRevenue) * 200 : 0;
                  const profitHeight = maxRevenue > 0 ? (Number(day.profit) / maxRevenue) * 200 : 0;
                  
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', position: 'relative' }}>
                      <div style={{ width: '100%', backgroundColor: '#dbeafe', height: `${revenueHeight}px`, position: 'absolute', bottom: 0, borderRadius: '4px 4px 0 0' }} title={`Revenue: ${formatCurrency(day.revenue)}`}></div>
                      <div style={{ width: '100%', backgroundColor: '#22c55e', height: `${profitHeight}px`, position: 'absolute', bottom: 0, borderRadius: '4px 4px 0 0' }} title={`Profit: ${formatCurrency(day.profit)}`}></div>
                      <div style={{ position: 'absolute', bottom: '-20px', fontSize: '10px', color: '#64748b' }}>
                        {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                      </div>
                    </div>
                  );
                }) : <p style={{ color: '#64748b', margin: 'auto' }}>No sales data available yet.</p>}
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#dbeafe', borderRadius: '2px' }}></div> <span style={{ fontSize: '13px', color: '#475569' }}>Revenue</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '2px' }}></div> <span style={{ fontSize: '13px', color: '#475569' }}>Profit</span></div>
            </div>
          </div>

          {/* TOP PRODUCTS */}
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Top Performing Products (By Revenue)</h3>
            {topProductsLoading ? <p>Loading products...</p> : (
              <table className="data-table" style={{ fontSize: '14px' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts?.map(tp => (
                    <tr key={tp.sku_id}>
                      <td style={{ fontWeight: '500' }}>{tp.product_name}</td>
                      <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{tp.sku_code}</td>
                      <td>{tp.units_sold}</td>
                      <td style={{ fontWeight: 'bold' }}>{formatCurrency(tp.revenue)}</td>
                      <td style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatCurrency(tp.profit)}</td>
                    </tr>
                  ))}
                  {topProducts?.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px' }}>No product sales recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* ALERTS */}
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Action Items</h3>
            </div>
            
            <Link to="/orders" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', textDecoration: 'none', color: 'inherit', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#b45309' }}>Pending Orders</div>
                <div style={{ fontSize: '13px', color: '#92400e' }}>Require fulfillment</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b45309' }}>
                {metricsLoading ? '-' : metrics?.pending_orders}
              </div>
            </Link>
          </div>

          {/* LOW STOCK ALERTS */}
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Stock Alerts</h3>
              <Link to="/inventory" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none' }}>View Ledger →</Link>
            </div>
            
            {lowStockLoading ? <p>Loading stock levels...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lowStock?.map(item => (
                  <div key={item.sku_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #fef2f2', backgroundColor: '#fff5f5', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#991b1b', fontSize: '14px' }}>{item.skus?.products?.name}</div>
                      <div style={{ fontSize: '12px', color: '#b91c1c', fontFamily: 'monospace' }}>{item.sku_code}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '16px' }}>{item.available_stock} left</div>
                      <div style={{ fontSize: '11px', color: '#ef4444' }}>Reorder: {item.skus?.reorder_level}</div>
                    </div>
                  </div>
                ))}
                {lowStock?.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#16a34a', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    All inventory levels are healthy!
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

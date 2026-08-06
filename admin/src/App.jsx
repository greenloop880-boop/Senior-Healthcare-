import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrdersManager from './pages/OrdersManager';
import InventoryManager from './pages/InventoryManager';
import ProductsManager from './pages/ProductsManager';
import CategoriesManager from './pages/CategoriesManager';
import BrandsManager from './pages/BrandsManager';
import SuppliersManager from './pages/SuppliersManager';
import PurchaseOrdersManager from './pages/PurchaseOrdersManager';
import ConcernsManager from './pages/ConcernsManager';
import HeroBannersManager from './pages/HeroBannersManager';
import HealthReviewsManager from './pages/HealthReviewsManager';
import CommunityVideosManager from './pages/CommunityVideosManager';
import CustomerReviewsManager from './pages/CustomerReviewsManager';
import CallbacksManager from './pages/CallbacksManager';
import UsersManager from './pages/UsersManager';
import NewsletterManager from './pages/NewsletterManager';
import SettingsManager from './pages/SettingsManager';
import { authService } from './services/authService';

function AdminLayout() {
  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/admin/login';
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          Senior Anandam Admin
        </div>
        <nav className="admin-nav">
          <NavLink to="/dashboard" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
          
          <div style={{ marginTop: '24px', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
            Master Data
          </div>
          <NavLink to="/products" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Products</NavLink>
          <NavLink to="/categories" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Categories</NavLink>
          <NavLink to="/brands" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Brands</NavLink>
          <NavLink to="/concerns" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Concerns</NavLink>

          <div style={{ marginTop: '24px', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
            Procurement
          </div>
          <NavLink to="/inventory" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Inventory</NavLink>
          <NavLink to="/purchase-orders" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Purchase Orders</NavLink>
          <NavLink to="/suppliers" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Suppliers</NavLink>

          <div style={{ marginTop: '24px', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
            Fulfillment
          </div>
          <NavLink to="/orders" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Customer Orders</NavLink>
          
          <div style={{ marginTop: '24px', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
            Other
          </div>
          <NavLink to="/users" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Registered Users</NavLink>
          <NavLink to="/hero" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Hero Banners</NavLink>
          <NavLink to="/health-reviews" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Health Reviews</NavLink>
          <NavLink to="/community-videos" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Community Videos</NavLink>
          <NavLink to="/customer-reviews" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Customer Reviews</NavLink>
          <NavLink to="/callbacks" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Callback Requests</NavLink>
          <NavLink to="/newsletter" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Newsletter Subscribers</NavLink>
          <NavLink to="/settings" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Settings</NavLink>
        </nav>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div style={{flex: 1}}></div>
          <button className="btn-secondary" onClick={handleLogout}>Logout</button>
        </header>
        <div className="admin-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<OrdersManager />} />
            <Route path="/inventory" element={<InventoryManager />} />
            <Route path="/products" element={<ProductsManager />} />
            <Route path="/categories" element={<CategoriesManager />} />
            <Route path="/brands" element={<BrandsManager />} />
            <Route path="/concerns" element={<ConcernsManager />} />
            <Route path="/suppliers" element={<SuppliersManager />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersManager />} />
            <Route path="/users" element={<UsersManager />} />
            <Route path="/hero" element={<HeroBannersManager />} />
            <Route path="/health-reviews" element={<HealthReviewsManager />} />
            <Route path="/community-videos" element={<CommunityVideosManager />} />
            <Route path="/customer-reviews" element={<CustomerReviewsManager />} />
            <Route path="/callbacks" element={<CallbacksManager />} />
            <Route path="/newsletter" element={<NewsletterManager />} />
            <Route path="/settings" element={<SettingsManager />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        
        <Route element={<AdminProtectedRoute />}>
          <Route path="/*" element={<AdminLayout />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

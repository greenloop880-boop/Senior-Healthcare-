import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ProductsManager from './pages/ProductsManager';
import CategoriesManager from './pages/CategoriesManager';
import ConcernsManager from './pages/ConcernsManager';
import HeroBannersManager from './pages/HeroBannersManager';
import HealthReviewsManager from './pages/HealthReviewsManager';
import CommunityVideosManager from './pages/CommunityVideosManager';
import CustomerReviewsManager from './pages/CustomerReviewsManager';
import CallbacksManager from './pages/CallbacksManager';
import UsersManager from './pages/UsersManager';
import NewsletterManager from './pages/NewsletterManager';
import SettingsManager from './pages/SettingsManager';

const ADMIN_PIN = "123456";

function AdminLayout({ setAuthenticated }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          Admin Panel
        </div>
        <nav className="admin-nav">
          <NavLink to="/products" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Products</NavLink>
          <NavLink to="/categories" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Categories</NavLink>
          <NavLink to="/concerns" className={({isActive}) => `admin-nav-item ${isActive ? 'active' : ''}`}>Concerns</NavLink>
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
          <button className="btn-secondary" onClick={() => setAuthenticated(false)}>Logout</button>
        </header>
        <div className="admin-content">
          <Routes>
            <Route path="/products" element={<ProductsManager />} />
            <Route path="/categories" element={<CategoriesManager />} />
            <Route path="/concerns" element={<ConcernsManager />} />
            <Route path="/users" element={<UsersManager />} />
            <Route path="/hero" element={<HeroBannersManager />} />
            <Route path="/health-reviews" element={<HealthReviewsManager />} />
            <Route path="/community-videos" element={<CommunityVideosManager />} />
            <Route path="/customer-reviews" element={<CustomerReviewsManager />} />
            <Route path="/callbacks" element={<CallbacksManager />} />
            <Route path="/newsletter" element={<NewsletterManager />} />
            <Route path="/settings" element={<SettingsManager />} />
            <Route path="*" element={<Navigate to="/products" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");

  if (!authenticated) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2 style={{ marginBottom: '24px' }}>Admin Login</h2>
          <div className="form-group">
            <label>Enter PIN</label>
            <input 
              type="password" 
              value={pin} 
              onChange={e => setPin(e.target.value)} 
              onKeyDown={e => {
                if (e.key === 'Enter' && pin === ADMIN_PIN) setAuthenticated(true);
              }}
            />
          </div>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => {
            if (pin === ADMIN_PIN) setAuthenticated(true);
            else alert("Invalid PIN");
          }}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AdminLayout setAuthenticated={setAuthenticated} />
    </BrowserRouter>
  );
}

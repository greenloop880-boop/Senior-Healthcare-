import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { CheckIcon } from './components/Icons';

import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Modals from './components/Modals';

import HomePage from './pages/HomePage';
import CollectionPage from './pages/CollectionPage';
import ProductPage from './pages/ProductPage';
import AboutPage from './pages/AboutPage';
import PolicyPage from './pages/PolicyPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';

function AppContent() {
  const { currentPage, toastMessage } = useAppContext();

  return (
    <div className="app-wrapper">
      {/* TOAST SYSTEM */}
      {toastMessage && (
        <div className="toast-success">
          <CheckIcon />
          <span>{toastMessage}</span>
        </div>
      )}

      <Header />

      {/* DYNAMIC PAGE ROUTER MOUNT */}
      {currentPage === "home" && <HomePage />}
      {currentPage === "collection" && <CollectionPage />}
      {currentPage === "about" && <AboutPage />}
      {currentPage === "policy" && <PolicyPage />}
      {currentPage === "product-detail" && <ProductPage />}
      {currentPage === "profile" && <ProfilePage />}
      {currentPage === "search" && <SearchPage />}

      <Footer />

      <CartDrawer />
      <Modals />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

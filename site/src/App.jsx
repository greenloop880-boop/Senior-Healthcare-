import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { CheckIcon } from './components/Icons';

import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Modals from './components/Modals';
import CheckoutModal from './components/CheckoutModal';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import HomePage from './pages/HomePage';
import CollectionPage from './pages/CollectionPage';
import ProductPage from './pages/ProductPage';

const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const PolicyPage = React.lazy(() => import('./pages/PolicyPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/OrderSuccessPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

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

      {/* Spacer so content doesn't hide under fixed header */}
      <div className="header-spacer" />

      {/* DYNAMIC PAGE ROUTER MOUNT */}
      {/* DYNAMIC PAGE ROUTER MOUNT */}
      {currentPage === "home" && <HomePage />}
      {currentPage === "collection" && <CollectionPage />}
      {currentPage === "product-detail" && <ProductPage />}
      
      <React.Suspense fallback={<div style={{ padding: '100px 0', textAlign: 'center', minHeight: '60vh' }}>Loading...</div>}>
        {currentPage === "about" && <AboutPage />}
        {currentPage === "policy" && <PolicyPage />}
        {currentPage === "profile" && <ProfilePage />}
        {currentPage === "search" && <SearchPage />}
        {currentPage === "order-success" && <OrderSuccessPage />}
      </React.Suspense>

      <Footer />

      <CartDrawer />
      <Modals />
      <CheckoutModal />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </QueryClientProvider>
  );
}

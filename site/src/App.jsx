import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { CheckIcon } from './components/Icons';

import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Modals from './components/Modals';
import CheckoutModal from './components/CheckoutModal';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const CollectionPage = React.lazy(() => import('./pages/CollectionPage'));
const ProductPage = React.lazy(() => import('./pages/ProductPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const PolicyPage = React.lazy(() => import('./pages/PolicyPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/OrderSuccessPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10, // 10 minutes – reduces redundant re-fetches
      gcTime: 1000 * 60 * 30,    // keep cache for 30 min
      retry: 1,                   // only 1 retry on failure
    },
  },
});

function AppContent() {
  const { currentPage, toastMessage, isAppReady } = useAppContext();

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

      <React.Suspense fallback={<div style={{ padding: '100px 0', textAlign: 'center', minHeight: '60vh' }} />}>
        {isAppReady && currentPage === "home" && <HomePage />}
        {isAppReady && currentPage === "collection" && <CollectionPage />}
        {isAppReady && currentPage === "product-detail" && <ProductPage />}
        {isAppReady && currentPage === "about" && <AboutPage />}
        {isAppReady && currentPage === "policy" && <PolicyPage />}
        {isAppReady && currentPage === "profile" && <ProfilePage />}
        {isAppReady && currentPage === "search" && <SearchPage />}
        {isAppReady && currentPage === "order-success" && <OrderSuccessPage />}
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

import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/authService';
import { supabase } from '../../supabase/client';

export default function AdminProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const session = await authService.getSession();
        if (!session) {
          if (mounted) setIsAuthenticated(false);
          return;
        }

        const isAdmin = await authService.checkIsAdmin();
        if (mounted) setIsAuthenticated(isAdmin);
      } catch (e) {
        console.error(e);
        if (mounted) setIsAuthenticated(false);
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
      } else if (event === 'SIGNED_IN') {
        const isAdmin = await authService.checkIsAdmin();
        setIsAuthenticated(isAdmin);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) {
    return <div className="loading-spinner">Verifying Admin Access...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" replace />;
}

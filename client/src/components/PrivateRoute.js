import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Redirect admins to dashboard if they try to access customer pages
  const customerOnlyPages = ['/cars', '/favorites', '/my-bookings', '/current-rentals', '/rentals'];
  const isCustomerPage = customerOnlyPages.some(page => location.pathname.startsWith(page));
  
  if (user?.role === 'admin' && isCustomerPage) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return children;
};

export default PrivateRoute;

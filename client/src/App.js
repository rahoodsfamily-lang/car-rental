import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import ModernLogin from './features/auth/ModernLogin';
import ModernRegister from './features/auth/ModernRegister';
import ResetPassword from './features/auth/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ResendVerification from './pages/ResendVerification';
import ModernProfile from './features/auth/ModernProfile';
import ModernLandingPage from './components/ModernLandingPage';
import AppLayout from './components/layout/AppLayout';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ModernCarList from './features/cars/ModernCarList';
import ModernCarDetail from './features/cars/ModernCarDetail';
// Old admin car components removed - using ModernFleetMaintenanceManager instead
import ModernUserBookings from './features/booking/ModernUserBookings';
import { RentalProvider } from './features/rental/RentalContext';

import ModernNotificationList from './features/notifications/ModernNotificationList';
import NotificationSettings from './features/settings/NotificationSettings';
// Modern Components
import ModernDashboardOverview from './features/dashboard/ModernDashboardOverview';
import ModernCurrentRentals from './features/rental/ModernCurrentRentals';
import ModernBookingRentalManager from './features/admin/ModernBookingRentalManager';
import ModernFleetMaintenanceManager from './features/admin/ModernFleetMaintenanceManager';
import ModernUserManager from './features/admin/ModernUserManager';
import FocusedAnalyticsReports from './features/admin/FocusedAnalyticsReports';
import ModernBookingDetail from './features/booking/ModernBookingDetail';
import { AdminDataProvider } from './contexts/AdminDataContext';
import { MaintenanceProvider } from './contexts/MaintenanceContext';
import { FavoritesProvider } from './features/favorites/FavoritesContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './features/notifications/NotificationContext';
import ModernFavoritesList from './features/favorites/ModernFavoritesList';
import PaymentPage from './features/payment/PaymentPage';
import ModernPaymentManagement from './features/admin/ModernPaymentManagement';
import ModernRefundManagement from './features/admin/ModernRefundManagement';
import './App.css';



function App() {
  const location = useLocation();
  const hideSidebar = ['/', '/login', '/register', '/reset-password', '/verify-email', '/resend-verification'].includes(location.pathname) || 
                      location.pathname.startsWith('/reset-password/');
  return (
    <ErrorBoundary>
      <SocketProvider>
        <NotificationProvider>
          <RentalProvider>
            <AdminDataProvider>
              <MaintenanceProvider>
                <FavoritesProvider>
                  <AppLayout>
          <Routes>
          <Route path="/" element={<ModernLandingPage />} />
          <Route path="/login" element={<ModernLogin />} />
          <Route path="/register" element={<ModernRegister />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/resend-verification" element={<ResendVerification />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/profile" element={
            <PrivateRoute>
              <ModernProfile />
            </PrivateRoute>
          } />
          <Route path="/notification-settings" element={
            <PrivateRoute>
              <NotificationSettings />
            </PrivateRoute>
          } />
          <Route path="/cars" element={
            <PrivateRoute>
              <ModernCarList />
            </PrivateRoute>
          } />
          <Route path="/favorites" element={
            <PrivateRoute>
              <ModernFavoritesList />
            </PrivateRoute>
          } />
          <Route path="/cars/:id" element={<ModernCarDetail />} />
          {/* Old admin car routes removed - use /admin/fleet instead */}
          {/* User Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <ModernDashboardOverview />
            </PrivateRoute>
          } />
          <Route path="/bookings" element={
            <PrivateRoute>
              <ModernUserBookings />
            </PrivateRoute>
          } />
          <Route path="/my-bookings" element={
            <PrivateRoute>
              <ModernUserBookings />
            </PrivateRoute>
          } />
          <Route path="/bookings/:id" element={
            <PrivateRoute>
              <ModernBookingDetail />
            </PrivateRoute>
          } />
          <Route path="/bookings/:id/edit" element={
            <Navigate to="/my-bookings" replace />
          } />
          <Route path="/current-rentals" element={
            <PrivateRoute>
              <ModernCurrentRentals />
            </PrivateRoute>
          } />
          <Route path="/rentals" element={
            <PrivateRoute>
              <ModernCurrentRentals />
            </PrivateRoute>
          } />

          <Route path="/payment/:bookingId" element={
            <PrivateRoute>
              <PaymentPage />
            </PrivateRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <ModernDashboardOverview />
            </AdminRoute>
          } />
          <Route path="/admin/bookings" element={
            <AdminRoute>
              <ModernBookingRentalManager />
            </AdminRoute>
          } />
          <Route path="/admin/rentals" element={
            <AdminRoute>
              <ModernBookingRentalManager />
            </AdminRoute>
          } />
          <Route path="/admin/fleet" element={
            <AdminRoute>
              <ModernFleetMaintenanceManager />
            </AdminRoute>
          } />
          <Route path="/admin/maintenance" element={
            <AdminRoute>
              <ModernFleetMaintenanceManager />
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <ModernUserManager />
            </AdminRoute>
          } />
          <Route path="/admin/verifications" element={
            <AdminRoute>
              <ModernUserManager />
            </AdminRoute>
          } />

          <Route path="/admin/analytics" element={
            <AdminRoute>
              <FocusedAnalyticsReports />
            </AdminRoute>
          } />
          <Route path="/admin/reports" element={
            <AdminRoute>
              <FocusedAnalyticsReports />
            </AdminRoute>
          } />
          <Route path="/admin/payments" element={
            <AdminRoute>
              <ModernPaymentManagement />
            </AdminRoute>
          } />
          <Route path="/admin/refunds" element={
            <AdminRoute>
              <ModernRefundManagement />
            </AdminRoute>
          } />
          <Route path="/notifications" element={
            <PrivateRoute>
              <ModernNotificationList />
            </PrivateRoute>
          } />
        </Routes>
              </AppLayout>
            </FavoritesProvider>
          </MaintenanceProvider>
        </AdminDataProvider>
      </RentalProvider>
        </NotificationProvider>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App;

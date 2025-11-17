import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../components/feedback/ToastProvider';

const AdminDataContext = createContext();

export const useAdminData = () => {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within AdminDataProvider');
  }
  return context;
};

export const AdminDataProvider = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();
  
  // Shared admin data state
  const [adminStats, setAdminStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [users, setUsers] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  // Cache duration: 30 seconds (for faster updates after database changes)
  const CACHE_DURATION = 30 * 1000;
  
  // Check if data needs refresh
  const needsRefresh = useCallback(() => {
    if (!lastFetchTime) return true;
    return Date.now() - lastFetchTime > CACHE_DURATION;
  }, [lastFetchTime]);
  
  // Fetch all admin data
  const fetchAdminData = useCallback(async (forceRefresh = false) => {
    // Only fetch if admin and (force refresh or cache expired)
    if (!user || user.role !== 'admin') return;
    if (!forceRefresh && !needsRefresh()) return;
    
    setLoading(true);
    try {
      // Parallel fetch all data
      const [statsRes, bookingsRes, rentalsRes, usersRes, carsRes] = await Promise.all([
        axiosInstance.get('/api/admin/stats'),
        axiosInstance.get('/api/bookings'),
        axiosInstance.get('/api/rentals'),
        axiosInstance.get('/api/admin/users'),
        axiosInstance.get('/api/cars')
      ]);
      
      // Process stats response
      if (statsRes.status === 200) {
        setAdminStats(statsRes.data);
      }
      
      // Set other data
      setBookings(bookingsRes.data.data || []);
      setRentals(rentalsRes.data || []);
      setUsers(usersRes.data.users || []);
      setCars(carsRes.data.cars || []);
      
      // Update cache time
      setLastFetchTime(Date.now());
      
    } catch (error) {
      // Silently handle timeout errors - admin data will retry on next refresh
      // Only show toast for non-timeout errors
      if (error.code !== 'ECONNABORTED') {
        toast?.error('Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  }, [user, needsRefresh, toast]);
  
  // Auto-fetch on mount and user change
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);
  
  // Computed values
  const getComputedStats = useCallback(() => {
    if (!adminStats || !rentals || !bookings) {
      return {
        activeRentals: 0,
        overdueRentals: 0,
        completedRentals: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        totalRevenue: 0,
        averageRentalDuration: 0,
        fleetUtilization: 0
      };
    }
    
    const activeRentals = rentals.filter(r => r.rentalStatus === 'active').length;
    const overdueRentals = rentals.filter(r => r.rentalStatus === 'overdue').length;
    const completedRentals = rentals.filter(r => r.rentalStatus === 'completed');
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    
    // Calculate average rental duration
    let averageRentalDuration = 0;
    if (completedRentals.length > 0) {
      const totalDuration = completedRentals.reduce((sum, rental) => {
        if (rental.checkOutDate && rental.checkInDate) {
          const duration = (new Date(rental.checkInDate) - new Date(rental.checkOutDate)) / (1000 * 60 * 60 * 24);
          return sum + duration;
        }
        return sum;
      }, 0);
      averageRentalDuration = Math.round((totalDuration / completedRentals.length) * 10) / 10;
    }
    
    // Calculate fleet utilization
    const fleetUtilization = cars.length > 0 
      ? Math.round((activeRentals / cars.length) * 100) 
      : 0;
    
    return {
      activeRentals,
      overdueRentals,
      completedRentals: completedRentals.length,
      pendingBookings,
      confirmedBookings,
      totalRevenue: adminStats?.stats?.totalRevenue || 0,
      averageRentalDuration,
      fleetUtilization
    };
  }, [adminStats, rentals, bookings, cars]);
  
  // Clear all cached data (for database resets)
  const clearCache = useCallback(() => {
    setAdminStats(null);
    setBookings([]);
    setRentals([]);
    setUsers([]);
    setCars([]);
    setLastFetchTime(null);
    // Force immediate refresh
    fetchAdminData(true);
  }, [fetchAdminData]);

  const value = {
    // Raw data
    adminStats,
    bookings,
    rentals,
    users,
    cars,
    
    // Computed stats
    computedStats: getComputedStats(),
    
    // Meta
    loading,
    lastFetchTime,
    
    // Actions
    refreshData: () => fetchAdminData(true),
    clearCache,
    needsRefresh
  };
  
  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
};

export default AdminDataContext;
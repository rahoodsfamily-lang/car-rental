import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar,
  useTheme,
  alpha,
  Divider,
  Button,
  IconButton,
  Alert,
  Badge,
  Tooltip,
  CircularProgress,
} from '@mui/material';

import {
  DashboardOutlined,
  DirectionsCarOutlined,
  BookOnlineOutlined,
  PeopleOutlined,
  PersonOutlineOutlined,
  NotificationsOutlined,
  CalendarTodayOutlined,
  AttachMoneyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  PendingOutlined,
  RefreshOutlined,
  CarRentalOutlined,
  AssignmentReturnOutlined,
  AssignmentTurnedInOutlined,
  ReportOutlined,
  AccessTimeOutlined,
  MoneyOffOutlined,
  BuildOutlined,
  EventNoteOutlined,
  EventAvailableOutlined,
  VerifiedUserOutlined,
  PaymentOutlined,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useBooking } from '../booking/BookingContext';
import { useRental } from '../rental/RentalContext';
import { useNotifications } from '../notifications/NotificationContext';
import { useMaintenanceContext } from '../../contexts/MaintenanceContext';
import { PageLoader } from '../../components/feedback/LoadingSpinner';
import StatsCard from '../../components/dashboard/StatsCard';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/feedback/ToastProvider';

const ModernDashboardOverview = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { bookings, loading: bookingsLoading, getUserBookings, getAllBookings } = useBooking();
  const { rentals, loading: rentalsLoading, getAllRentals, getUserRentals } = useRental();
  const { notifications, loading: notificationsLoading, fetchNotifications } = useNotifications();
  const { maintenanceRecords, stats: maintenanceStats, fetchMaintenanceRecords, fetchMaintenanceStats } = useMaintenanceContext();
  
  const [dashboardData, setDashboardData] = useState({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    recentBookings: [],
    upcomingBookings: [],
    recentNotifications: [],
  });
  
  const [rentalData, setRentalData] = useState({
    totalRentals: 0,
    activeRentals: 0,
    overdueRentals: 0,
    completedRentals: 0,
    rentalRevenue: 0,
    lateFees: 0,
    damageFees: 0,
    averageDuration: 0,
    recentCheckouts: [],
    recentCheckins: [],
    upcomingReturns: [],
    overdueAlerts: [],
  });
  
  const [adminStats, setAdminStats] = useState(null);
  const [carStats, setCarStats] = useState({ maintenanceCars: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Operational data for streamlined metrics
  const [operationalData, setOperationalData] = useState({
    overdueRentals: [],
    pendingBookings: [],
    pendingPayments: 0,
    todayCheckouts: [],
    todayReturns: [],
    unreadNotifications: [],
    criticalAlerts: [],
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {

        if (user.role === 'admin') {
          // Fetch admin dashboard stats
          await fetchAdminStats();
          await fetchCarStats();
          await fetchPendingPayments();
          await getAllBookings();
          await getAllRentals();
          await fetchMaintenanceRecords();
          await fetchMaintenanceStats();
        } else {
          await getUserBookings(user._id);
          await getUserRentals();
        }
        await fetchNotifications(user._id, true); // isPolling = true to prevent loading spinner
      } catch (error) {
        // Handle error silently or show user-friendly message
        toast?.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    fetchData();
  }, [user]);
  
  const fetchAdminStats = async () => {
    try {
      const response = await axiosInstance.get('/api/admin/stats');
      
      if (response.status === 200) {
        const data = response.data;
        setAdminStats(data);
      }
    } catch (error) {
      // Handle error silently or add proper error handling if needed
    }
  };

  const fetchCarStats = async () => {
    try {
      const response = await axiosInstance.get('/api/cars');
      
      if (response.status === 200) {
        const data = response.data;
        // Handle both array response and object with cars property
        const cars = Array.isArray(data) ? data : (data.cars || []);
        const maintenanceCars = cars.filter(car => car.availability === 'maintenance').length;
        setCarStats({ maintenanceCars });
      }
    } catch (error) {
      console.error('Error fetching car stats:', error);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await axiosInstance.get('/api/payments/all');
      
      if (response.status === 200) {
        const payments = response.data.payments || response.data || [];
        const pendingCount = payments.filter(payment => payment.status === 'pending').length;
        setOperationalData(prev => ({
          ...prev,
          pendingPayments: pendingCount
        }));
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    }
  };


  useEffect(() => {
    if (bookings && notifications) {
      const activeBookings = bookings.filter(b => ['confirmed', 'pending'].includes(b.status));
      const completedBookings = bookings.filter(b => b.status === 'completed');
      const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
      
      // Get upcoming bookings (next 7 days)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingBookings = bookings
        .filter(b => {
          const startDate = new Date(b.startDate);
          return startDate >= today && startDate <= nextWeek && ['confirmed', 'pending'].includes(b.status);
        })
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      // Get recent bookings (last 5)
      const recentBookings = [...bookings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      // Get recent notifications (last 5) with proper filtering
      const recentNotifications = [...notifications]
        .filter(notification => {
          // Filter out booking confirmations (like notification page)
          if (notification.type === 'booking_confirmation') return false;
          
          // Role-based filtering (like notification page)
          if (user?.role === 'admin') {
            // Admins should only see admin-targeted notifications
            if (!notification.isAdminCopy) return false;
          } else {
            // Customers should only see customer-targeted notifications
            if (notification.isAdminCopy) return false;
          }
          
          // Only show unread notifications in recent activity
          return !notification.seen;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setDashboardData({
        totalBookings: bookings.length,
        activeBookings: activeBookings.length,
        completedBookings: completedBookings.length,
        totalRevenue,
        recentBookings,
        upcomingBookings,
        recentNotifications,
      });
    }
  }, [bookings, notifications]);
  
  useEffect(() => {
    if (rentals) {
      const today = new Date();
      const activeRentals = rentals.filter(r => r.rentalStatus === 'active');
      const overdueRentals = rentals.filter(r => r.rentalStatus === 'overdue');
      const completedRentals = rentals.filter(r => r.rentalStatus === 'completed');
      
      // Calculate rental revenue and fees (completed + active rentals)
      const completedAndActiveRentals = rentals.filter(r => ['completed', 'active'].includes(r.rentalStatus));
      const rentalRevenue = completedAndActiveRentals.reduce((sum, rental) => sum + (rental.totalRentalFee || 0), 0);
      const lateFees = completedAndActiveRentals.reduce((sum, rental) => sum + (rental.lateFee || 0), 0);
      const damageFees = completedAndActiveRentals.reduce((sum, rental) => sum + (rental.damageFee || 0), 0);
      
      // Calculate average rental duration
      const durationsInDays = completedRentals
        .filter(r => r.checkInDate && r.checkOutDate)
        .map(r => {
          const checkIn = new Date(r.checkInDate);
          const checkOut = new Date(r.checkOutDate);
          return Math.ceil((checkIn - checkOut) / (1000 * 60 * 60 * 24));
        });
      const rawAverage = durationsInDays.length > 0 
        ? durationsInDays.reduce((sum, days) => sum + days, 0) / durationsInDays.length
        : 0;
      const averageDuration = Math.round(rawAverage * 10) / 10;
      
      // Get recent checkouts (last 5)
      const recentCheckouts = [...rentals]
        .filter(r => r.checkOutDate)
        .sort((a, b) => new Date(b.checkOutDate) - new Date(a.checkOutDate))
        .slice(0, 5);
      
      // Get recent checkins (last 5)
      const recentCheckins = [...rentals]
        .filter(r => r.checkInDate)
        .sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate))
        .slice(0, 5);
      
      // Get upcoming returns (next 3 days)
      const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      const upcomingReturns = activeRentals
        .filter(r => {
          // Skip rentals with invalid car data
          if (!r.car) return false;
          if (!r.booking?.endDate) return false;
          const endDate = new Date(r.booking.endDate);
          return endDate >= today && endDate <= threeDaysFromNow;
        })
        .sort((a, b) => new Date(a.booking.endDate) - new Date(b.booking.endDate));
      
      // Get overdue alerts
      const overdueAlerts = overdueRentals.slice(0, 5);
      
      setRentalData({
        totalRentals: rentals.length,
        activeRentals: activeRentals.length,
        overdueRentals: overdueRentals.length,
        completedRentals: completedRentals.length,
        rentalRevenue,
        lateFees,
        damageFees,
        averageDuration,
        recentCheckouts,
        recentCheckins,
        upcomingReturns,
        overdueAlerts,
      });
      
      // Process operational data
      const todayForOps = new Date();
      todayForOps.setHours(0, 0, 0, 0);
      
      // Get overdue rentals for operational data
      const operationalOverdueRentals = rentals.filter(r => 
        r.rentalStatus === 'overdue' || 
        (r.rentalStatus === 'active' && new Date(r.expectedReturnDate || r.booking?.endDate) < new Date())
      );
      
      // Set operational data
      setOperationalData(prev => ({
        ...prev,
        overdueRentals: operationalOverdueRentals,
      }));
    }
  }, [rentals]);
  
  // Process bookings for operational data
  useEffect(() => {
    if (bookings) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get ALL pending bookings that need approval
      const pendingBookings = bookings.filter(b => b.status === 'pending');
      
      // Today's checkouts
      const todayCheckouts = bookings.filter(b => {
        const pickupDate = new Date(b.pickupDate);
        pickupDate.setHours(0, 0, 0, 0);
        return b.status === 'confirmed' && 
               pickupDate.getTime() === today.getTime();
      });
      
      // Today's expected returns (from rentals)
      const todayReturns = rentals ? rentals.filter(r => {
        const returnDate = new Date(r.expectedReturnDate || r.booking?.endDate || '');
        if (isNaN(returnDate.getTime())) return false;
        returnDate.setHours(0, 0, 0, 0);
        return r.rentalStatus === 'active' && 
               returnDate.getTime() === today.getTime();
      }) : [];
      
      // Update operational data
      setOperationalData(prev => ({
        ...prev,
        pendingBookings,
        todayCheckouts,
        todayReturns,
      }));
    }
  }, [bookings, rentals]);
  
  // Process notifications for operational data
  useEffect(() => {
    if (notifications) {
      // Get unread notifications
      const unreadNotifications = notifications.filter(n => !n.seen);
      
      // Update operational data
      setOperationalData(prev => ({
        ...prev,
        unreadNotifications,
      }));
    }
  }, [notifications]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircleOutlined fontSize="small" />;
      case 'pending': return <PendingOutlined fontSize="small" />;
      case 'cancelled': return <WarningOutlined fontSize="small" />;
      case 'completed': return <CheckCircleOutlined fontSize="small" />;
      default: return <PendingOutlined fontSize="small" />;
    }
  };

  const handleRefresh = async () => {
    if (!user || refreshing) return;
    
    setRefreshing(true);
    try {
      if (user.role === 'admin') {
        // Fetch all admin dashboard stats - same as initial load
        await fetchAdminStats();
        await fetchCarStats();
        await fetchPendingPayments();
        await getAllBookings();
        await getAllRentals();
        await fetchMaintenanceRecords();
        await fetchMaintenanceStats();
      } else {
        await getUserBookings(user._id);
        await getUserRentals();
      }
      await fetchNotifications(user._id, true); // isPolling = true to prevent loading spinner
      
      // Show success message
      toast?.success('Data refreshed successfully');
    } catch (error) {
      // Handle error silently or show user-friendly message
      toast?.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Only show loader on initial load or when explicitly loading
  // This prevents flicker when contexts update their loading states
  if (!initialLoadComplete && (loading || bookingsLoading || rentalsLoading || notificationsLoading)) {
    return <PageLoader message="Loading dashboard..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        mb: { xs: 2, sm: 3, md: 4 } 
      }}>
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: { xs: 1.5, sm: 2 },
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 1.5, md: 2 },
            }}
          >
            <DashboardOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
            Dashboard Overview
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: { xs: 2, sm: 2.5, md: 3 },
              lineHeight: 1.6,
            }}
          >
            Welcome back, {user?.profile?.firstName || user?.firstName || 'User'}! Here's your rental activity summary.
          </Typography>
        </Box>

        <Tooltip title={refreshing ? "Refreshing..." : "Refresh Dashboard"}>
          <span>
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                width: { xs: 36, sm: 40 },
                height: { xs: 36, sm: 40 },
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              {refreshing ? (
                <CircularProgress size={20} sx={{ color: 'primary.main' }} />
              ) : (
                <RefreshOutlined sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Overdue Rentals Alert */}
      {user?.role === 'admin' && rentalData.overdueRentals > 0 && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            '& .MuiAlert-icon': {
              alignSelf: { xs: 'flex-start', sm: 'center' }
            },
            '& .MuiAlert-message': {
              alignSelf: 'center',
              width: '100%'
            },
            '& .MuiAlert-action': {
              alignSelf: { xs: 'flex-start', sm: 'center' },
              paddingTop: { xs: 1, sm: 0 },
              paddingLeft: { xs: 0, sm: 2 },
              width: { xs: '100%', sm: 'auto' }
            }
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/admin/bookings?tab=1&rentalTab=3')}
              fullWidth={{ xs: true, sm: false }}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
            >
              View Details
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
            {rentalData.overdueRentals} overdue rental{rentalData.overdueRentals > 1 ? 's' : ''} requiring immediate attention!
          </Typography>
        </Alert>
      )}

      {/* Pending Payments Alert */}
      {user?.role === 'admin' && operationalData.pendingPayments > 5 && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            '& .MuiAlert-icon': {
              alignSelf: { xs: 'flex-start', sm: 'center' }
            },
            '& .MuiAlert-message': {
              alignSelf: 'center',
              width: '100%'
            },
            '& .MuiAlert-action': {
              alignSelf: { xs: 'flex-start', sm: 'center' },
              paddingTop: { xs: 1, sm: 0 },
              paddingLeft: { xs: 0, sm: 2 },
              width: { xs: '100%', sm: 'auto' }
            }
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/admin/payments')}
              fullWidth={{ xs: true, sm: false }}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
            >
              Verify Payments
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
            {operationalData.pendingPayments} pending payment{operationalData.pendingPayments > 1 ? 's' : ''} awaiting verification! Process them to confirm customer bookings.
          </Typography>
        </Alert>
      )}

      {/* High Pending Bookings Alert */}
      {user?.role === 'admin' && operationalData.pendingBookings.length > 20 && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            '& .MuiAlert-icon': {
              alignSelf: { xs: 'flex-start', sm: 'center' }
            },
            '& .MuiAlert-message': {
              alignSelf: 'center',
              width: '100%'
            },
            '& .MuiAlert-action': {
              alignSelf: { xs: 'flex-start', sm: 'center' },
              paddingTop: { xs: 1, sm: 0 },
              paddingLeft: { xs: 0, sm: 2 },
              width: { xs: '100%', sm: 'auto' }
            }
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/admin/bookings?tab=0&bookingTab=1')}
              fullWidth={{ xs: true, sm: false }}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
            >
              Process Now
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
            {operationalData.pendingBookings.length} pending bookings awaiting approval! Consider processing them to avoid customer delays.
          </Typography>
        </Alert>
      )}



      {/* Key Operational Metrics - Admin Only */}
      {user?.role === 'admin' && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(6, 1fr)'
          },
          gap: { xs: 1.5, sm: 2 },
          mb: { xs: 2, sm: 3, md: 4 } 
        }}>
          <StatsCard
            title="Overdue Rentals"
            value={operationalData.overdueRentals.length}
            subtitle={operationalData.overdueRentals.length > 0 ? "Action required" : "No overdue rentals"}
            icon={<WarningOutlined />}
            color="error"
          />
          
          <StatsCard
            title="Pending Approvals"
            value={operationalData.pendingBookings.length}
            subtitle={
              operationalData.pendingBookings.length > 10 
                ? "High volume - needs attention!" 
                : operationalData.pendingBookings.length > 0 
                  ? "Needs confirmation" 
                  : "All clear"
            }
            icon={<PendingOutlined />}
            color={operationalData.pendingBookings.length > 10 ? "error" : "warning"}
          />
          
          <StatsCard
            title="Payment Verification"
            value={operationalData.pendingPayments}
            subtitle={
              operationalData.pendingPayments > 10 
                ? "High volume - verify now!" 
                : operationalData.pendingPayments > 0 
                  ? "Awaiting verification" 
                  : "All verified"
            }
            icon={<PaymentOutlined />}
            color={operationalData.pendingPayments > 10 ? "error" : operationalData.pendingPayments > 0 ? "warning" : "success"}
          />
          
          <StatsCard
            title="Today's Deliveries"
            value={operationalData.todayCheckouts.length}
            subtitle={operationalData.todayCheckouts.length > 0 ? "Prepare vehicles" : "None scheduled"}
            icon={<DirectionsCarOutlined />}
            color="info"
          />
          
          <StatsCard
            title="Today's Returns"
            value={operationalData.todayReturns.length}
            subtitle={operationalData.todayReturns.length > 0 ? "Expected returns" : "None expected"}
            icon={<AssignmentReturnOutlined />}
            color="success"
          />
          
          <StatsCard
            title="Cars in Service"
            value={carStats.maintenanceCars}
            subtitle={carStats.maintenanceCars > 0 ? "Vehicles unavailable" : "All operational"}
            icon={<BuildOutlined />}
            color="warning"
          />
        </Box>
      )}



      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
        {user?.role === 'admin' ? (
          // Admin Rental Management Sections
          <>
            {/* Recent Check-outs */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', borderRadius: { xs: 1, sm: 2 } }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 2.5, md: 3 }, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' } }}>
                      <AssignmentReturnOutlined sx={{ color: 'success.main', fontSize: { xs: 20, sm: 22, md: 24 } }} />
                      Recent Deliveries
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => navigate('/admin/bookings?tab=1&rentalTab=1')}
                      sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                    >
                      Manage All
                    </Button>
                  </Box>

                  {rentalData.recentCheckouts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 4 } }}>
                      <AssignmentReturnOutlined sx={{ fontSize: { xs: 36, sm: 42, md: 48 }, color: 'text.secondary', mb: { xs: 1, sm: 2 } }} />
                      <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        No recent deliveries
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {rentalData.recentCheckouts.map((rental, index) => (
                        <React.Fragment key={rental._id}>
                          <ListItem sx={{ px: 0, py: { xs: 1.5, sm: 2 } }}>
                            <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                              <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}>
                                <CarRentalOutlined sx={{ color: 'success.main', fontSize: { xs: 18, sm: 20 } }} />
                              </Avatar>
                            </ListItemIcon>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <DirectionsCarOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                                  {`${rental.car?.year} ${rental.car?.make} ${rental.car?.model}`}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <PersonOutlineOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                  {rental.user?.profile?.firstName} {rental.user?.profile?.lastName}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CalendarTodayOutlined sx={{ fontSize: { xs: 12, sm: 14 }, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                    {new Date(rental.checkOutDate).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                  • {rental.rentalDays || 1} day{rental.rentalDays !== 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            </Box>
                          </ListItem>
                          {index < rentalData.recentCheckouts.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Check-ins */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', borderRadius: { xs: 1, sm: 2 } }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 2.5, md: 3 }, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' } }}>
                      <AssignmentTurnedInOutlined sx={{ color: 'info.main', fontSize: { xs: 20, sm: 22, md: 24 } }} />
                      Recent Check-ins
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => navigate('/admin/bookings?tab=1&rentalTab=2')}
                      sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                    >
                      View All
                    </Button>
                  </Box>

                  {rentalData.recentCheckins.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 4 } }}>
                      <AssignmentTurnedInOutlined sx={{ fontSize: { xs: 36, sm: 42, md: 48 }, color: 'text.secondary', mb: { xs: 1, sm: 2 } }} />
                      <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        No recent check-ins
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {rentalData.recentCheckins.map((rental, index) => (
                        <React.Fragment key={rental._id}>
                          <ListItem sx={{ px: 0, py: { xs: 1.5, sm: 2 } }}>
                            <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                              <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}>
                                <CheckCircleOutlined sx={{ color: 'info.main', fontSize: { xs: 18, sm: 20 } }} />
                              </Avatar>
                            </ListItemIcon>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <DirectionsCarOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                                  {`${rental.car?.year} ${rental.car?.make} ${rental.car?.model}`}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <PersonOutlineOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                  {rental.user?.profile?.firstName} {rental.user?.profile?.lastName}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CalendarTodayOutlined sx={{ fontSize: { xs: 12, sm: 14 }, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                    {new Date(rental.checkInDate).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                  ₱{((rental.totalRentalFee || 0) + (rental.lateFee || 0) + (rental.damageFee || 0)).toLocaleString()}
                                </Typography>
                                {(rental.lateFee > 0 || rental.damageFee > 0) && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                    {rental.lateFee > 0 && rental.damageFee > 0 
                                      ? `(+late/damage)`
                                      : rental.lateFee > 0 
                                      ? `(+late fee)`
                                      : `(+damage)`
                                    }
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </ListItem>
                          {index < rentalData.recentCheckins.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Upcoming Returns */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', borderRadius: { xs: 1, sm: 2 } }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 2.5, md: 3 }, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' } }}>
                      <AccessTimeOutlined sx={{ color: 'warning.main', fontSize: { xs: 20, sm: 22, md: 24 } }} />
                      Upcoming Returns (3 Days)
                    </Typography>
                    <Badge badgeContent={rentalData.upcomingReturns.length} color="warning">
                      <Button
                        size="small"
                        onClick={() => navigate('/admin/bookings?tab=1&rentalTab=1')}
                        sx={{ textTransform: 'none', fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                      >
                        View All
                      </Button>
                    </Badge>
                  </Box>

                  {rentalData.upcomingReturns.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 4 } }}>
                      <AccessTimeOutlined sx={{ fontSize: { xs: 36, sm: 42, md: 48 }, color: 'text.secondary', mb: { xs: 1, sm: 2 } }} />
                      <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        No upcoming returns
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {rentalData.upcomingReturns.map((rental, index) => (
                        <React.Fragment key={rental._id}>
                          <ListItem sx={{ px: 0, py: { xs: 1.5, sm: 2 } }}>
                            <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                              <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}>
                                <DirectionsCarOutlined sx={{ color: 'warning.main', fontSize: { xs: 18, sm: 20 } }} />
                              </Avatar>
                            </ListItemIcon>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <DirectionsCarOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                                  {rental.car ? `${rental.car.year || ''} ${rental.car.make || ''} ${rental.car.model || ''}`.trim() : 'Car details unavailable'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <PersonOutlineOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                  {rental.user?.profile ? `${rental.user.profile.firstName || ''} ${rental.user.profile.lastName || ''}`.trim() : rental.user?.email || 'Customer details unavailable'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarTodayOutlined sx={{ fontSize: { xs: 12, sm: 14 }, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                  Due: {rental.booking?.endDate ? new Date(rental.booking.endDate).toLocaleDateString() : 'Date unavailable'}
                                </Typography>
                              </Box>
                            </Box>
                          </ListItem>
                          {index < rentalData.upcomingReturns.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsOutlined sx={{ color: 'primary.main' }} />
                  Recent Activity
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/notifications')}
                  sx={{ textTransform: 'none' }}
                >
                  View All
                </Button>
              </Box>

              {dashboardData.recentNotifications.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <NotificationsOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No unread notifications
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {dashboardData.recentNotifications.map((notification, index) => (
                    <React.Fragment key={notification._id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Avatar 
                            sx={{ 
                              bgcolor: notification.seen 
                                ? alpha(theme.palette.grey[500], 0.1) 
                                : alpha(theme.palette.primary.main, 0.1),
                              width: 32,
                              height: 32,
                            }}
                          >
                            <NotificationsOutlined 
                              sx={{ 
                                color: notification.seen ? 'text.secondary' : 'primary.main',
                                fontSize: 18,
                              }} 
                            />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={notification.subject || notification.message}
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </Typography>
                          }
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontWeight: notification.seen ? 400 : 600,
                              fontSize: '0.875rem',
                            },
                          }}
                        />
                      </ListItem>
                      {index < dashboardData.recentNotifications.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
          </>
        ) : null}

        {/* Quick Actions - Admin Only */}
        {user?.role === 'admin' && (
        <Grid item xs={12}>
          <Paper sx={{ p: { xs: 2, sm: 2.5, md: 3 }, borderRadius: { xs: 1, sm: 2 } }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: { xs: 2, sm: 2.5, md: 3 }, fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' } }}>
              Quick Actions
            </Typography>
            
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {/* DYNAMIC PRIORITY ACTIONS - Show based on operational needs */}
              
              {/* Priority 1: Handle overdue rentals - CRITICAL */}
              {operationalData.overdueRentals.length > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<WarningOutlined sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                    onClick={() => navigate('/admin/bookings?tab=1&rentalTab=3')}
                    sx={{
                      py: { xs: 1.25, sm: 1.5 },
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' },
                      bgcolor: 'error.main',
                      '&:hover': {
                        bgcolor: 'error.dark',
                      },
                    }}
                  >
                    Handle Overdue ({operationalData.overdueRentals.length})
                  </Button>
                </Grid>
              )}
              
              {/* Priority 2: Process pending bookings - IMPORTANT */}
              {operationalData.pendingBookings.length > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PendingOutlined sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                    onClick={() => navigate('/admin/bookings?tab=0&bookingTab=1')}
                    sx={{
                      py: { xs: 1.25, sm: 1.5 },
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' },
                      bgcolor: 'warning.main',
                      color: '#ffffff',
                      '&:hover': {
                        bgcolor: 'warning.dark',
                        color: '#ffffff',
                      },
                    }}
                  >
                    Approve Bookings ({operationalData.pendingBookings.length})
                  </Button>
                </Grid>
              )}
              
              {/* Priority 3: Process today's checkouts */}
              {operationalData.todayCheckouts.length > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AssignmentTurnedInOutlined sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                    onClick={() => navigate('/admin/bookings?tab=0&bookingTab=2')}
                    sx={{
                      py: { xs: 1.25, sm: 1.5 },
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' },
                      bgcolor: 'info.main',
                      '&:hover': {
                        bgcolor: 'info.dark',
                      },
                    }}
                  >
                    Process Checkouts ({operationalData.todayCheckouts.length})
                  </Button>
                </Grid>
              )}
              
              {/* Process Returns - Shows when there are returns today */}
              {operationalData.todayReturns.length > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AssignmentReturnOutlined sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                    onClick={() => navigate('/admin/bookings?tab=1&rentalTab=1')}
                    sx={{
                      py: { xs: 1.25, sm: 1.5 },
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' },
                      bgcolor: 'success.main',
                      '&:hover': {
                        bgcolor: 'success.dark',
                      },
                    }}
                  >
                    Process Returns ({operationalData.todayReturns.length})
                  </Button>
                </Grid>
              )}
              
              {/* Review Verifications - Shows when there are pending verifications */}
              {operationalData.pendingVerifications > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<VerifiedUserOutlined sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                    onClick={() => navigate('/admin/verifications')}
                    sx={{
                      py: { xs: 1.25, sm: 1.5 },
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.8125rem', sm: '0.875rem', md: '0.9375rem' },
                      bgcolor: 'info.main',
                      color: '#ffffff',
                      '&:hover': {
                        bgcolor: 'info.dark',
                        color: '#ffffff',
                      },
                    }}
                  >
                    Review Verifications ({operationalData.pendingVerifications})
                  </Button>
                </Grid>
              )}
              
              {/* CORE ACTIONS - Always visible for quick access */}
              
              {/* Add New Vehicle */}
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DirectionsCarOutlined />}
                  onClick={() => navigate('/admin/fleet')}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  Add Vehicle
                </Button>
              </Grid>
              
              {/* Manage Maintenance */}
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<BuildOutlined />}
                  onClick={() => navigate('/admin/fleet?tab=2')}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  Manage Maintenance
                </Button>
              </Grid>
              
              {/* Manage Users */}
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<PeopleOutlined />}
                  onClick={() => navigate('/admin/fleet')}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  Manage Users
                </Button>
              </Grid>
              
              {/* View Today's Report */}
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ReportOutlined />}
                  onClick={() => navigate('/admin/analytics')}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  Today's Report
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default ModernDashboardOverview;
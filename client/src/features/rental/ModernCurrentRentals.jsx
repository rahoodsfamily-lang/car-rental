import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import { getImageUrl } from '../../utils/imageHelper';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  Divider,
  Paper,
  LinearProgress,
  Tab,
  Tabs,
  useTheme,
  alpha,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Pagination,
  Tooltip,
  CircularProgress,
  useMediaQuery,
} from '@mui/material';
import {
  DirectionsCarOutlined,
  CalendarTodayOutlined,
  LocationOnOutlined,
  AccessTimeOutlined,
  ExtensionOutlined,
  RateReviewOutlined,
  LocalGasStationOutlined,
  SpeedOutlined,
  PeopleOutlined,
  CancelOutlined,
  RefreshOutlined,
  CheckCircleOutlined,
  ErrorOutlined,
  UpdateOutlined,
  NotificationsActiveOutlined,
  PaymentOutlined,
  EmailOutlined,
} from '@mui/icons-material';

import { useAuth } from '../auth/AuthContext';
import { useBooking } from '../booking/BookingContext';
import { useRental } from './RentalContext';
import { useNotifications } from '../notifications/NotificationContext';
import { PageLoader, CardSkeleton } from '../../components/feedback/LoadingSpinner';
import { EmptyRentals } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';
import { useNavigate } from 'react-router-dom';
import { formatRentalId } from '../../utils/formatters';

const ModernCurrentRentals = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // Mobile and tablet
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(5); // Show 5 rentals per page
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bookings, loading: bookingLoading, getUserBookings } = useBooking();
  const { userRentals, loading: rentalLoading, getUserRentals } = useRental();
  const { fetchNotifications, fetchUnreadCount } = useNotifications();
  const toast = useToast();
  
  const loading = bookingLoading || rentalLoading;
  
  const [extendDialog, setExtendDialog] = useState({ open: false, booking: null });
  const [reviewDialog, setReviewDialog] = useState({ open: false, booking: null });
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewedCars, setReviewedCars] = useState(new Set()); // Track cars already reviewed
  const [extendDays, setExtendDays] = useState(1);
  const [extendError, setExtendError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const paginationRef = useRef(null);

  // Function to fetch rentals already reviewed by user
  const fetchReviewedRentals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axiosInstance.get('/api/reviews/eligible-cars', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Get all rental IDs from eligible rentals (rentals NOT yet reviewed)
      const eligibleRentalIds = new Set(response.data.map(rental => rental._id));
      
      // Get all rental IDs from user's rentals
      const allRentalIds = new Set();
      if (userRentals) {
        userRentals.forEach(rental => {
          if (rental._id) {
            allRentalIds.add(rental._id);
          }
        });
      }
      
      // Rentals that are NOT eligible = already reviewed
      const reviewedRentalIds = new Set();
      allRentalIds.forEach(rentalId => {
        if (!eligibleRentalIds.has(rentalId)) {
          reviewedRentalIds.add(rentalId);
        }
      });
      
      setReviewedCars(reviewedRentalIds); // Keep same state name for now
    } catch (error) {
      console.error('Error fetching reviewed cars:', error);
    }
  };

  useEffect(() => {
    if (user) {
      getUserBookings(user.id || user._id);
      getUserRentals(); // Fetch actual rental data
    }
  }, [user]);

  useEffect(() => {
    if (userRentals && userRentals.length > 0) {
      fetchReviewedRentals();
    }
  }, [userRentals]);

  // Calculate rental statistics from actual rental data
  const rentalsArray = Array.isArray(userRentals) ? userRentals : [];
  const stats = {
    total: rentalsArray.length || 0,
    active: rentalsArray.filter(r => r && r.rentalStatus === 'active').length || 0,
    completed: rentalsArray.filter(r => r && r.rentalStatus === 'completed').length || 0,
    cancelled: rentalsArray.filter(r => r && r.rentalStatus === 'cancelled').length || 0,
    overdue: rentalsArray.filter(r => r && r.rentalStatus === 'overdue').length || 0,
  };



  // Helper to filter rentals by status using actual rental data
  const filterRentalsByStatus = (status) => {
    const rentalsArray = Array.isArray(userRentals) ? userRentals : [];
    switch(status){
      case 'all':
        return rentalsArray;
      case 'active':
        return rentalsArray.filter(r => r && r.rentalStatus === 'active');
      case 'completed':
        return rentalsArray.filter(r => r && r.rentalStatus === 'completed');
      case 'cancelled':
        return rentalsArray.filter(r => r && r.rentalStatus === 'cancelled');
      case 'overdue':
        return rentalsArray.filter(r => r && r.rentalStatus === 'overdue');
      default:
        return rentalsArray;
    }
  };

  const statusMap=['all','active','completed','cancelled','overdue'];

  // Get filtered rentals based on current tab
  const filteredRentals = filterRentalsByStatus(statusMap[tabValue]);
  
  // Apply pagination
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedRentals = filteredRentals.slice(startIndex, endIndex);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredRentals.length / itemsPerPage);
  
  const currentRentals = Array.isArray(userRentals) 
    ? userRentals.filter(rental => rental && rental.rentalStatus === 'active')
    : [];

  // Handle page change
  const handlePageChange = (event, newPage) => {
    const oldPage = page;
    setPage(newPage);
    
    // When going backwards, always ensure pagination stays in view
    if (newPage < oldPage) {
      setTimeout(() => {
        if (paginationRef.current) {
          // Always scroll to show pagination at bottom of viewport when going backwards
          paginationRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end' // This puts pagination at bottom of viewport
          });
        }
      }, 100);
    }
  };

  // Handle tab change - reset to first page
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(1); // Reset to first page when changing tabs
  };

  const calculateProgress = (rental) => {
    // If rental is completed, always show 100% progress
    if (rental.rentalStatus === 'completed') {
      return 100;
    }
    
    // If rental is cancelled, don't calculate progress
    if (rental.rentalStatus === 'cancelled') {
      return 0;
    }
    
    if (!rental.booking) return 0;
    const start = new Date(rental.booking.startDate);
    const end = new Date(rental.booking.endDate);
    const now = new Date();
    
    const total = end - start;
    const elapsed = now - start;
    
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const getRemainingDays = (rental) => {
    // If rental is completed, return -1 to indicate completion
    if (rental.rentalStatus === 'completed') {
      return -1;
    }
    
    // If rental is cancelled, return null to indicate no remaining days
    if (rental.rentalStatus === 'cancelled') {
      return null;
    }
    
    if (!rental.booking) return 0;
    const end = new Date(rental.booking.endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  const handleExtendRental = (booking) => {
    setExtendDays(1); // Reset to default
    setExtendError(''); // Clear any error
    setExtendDialog({ open: true, booking });
  };

  const handleSubmitExtension = async () => {
    try {
      const token = localStorage.getItem('token');
      const rental = extendDialog.booking; // This is the rental object
      
      if (!rental || !rental.booking) {
        toast.error('Invalid rental information');
        return;
      }
      
      // Validate extendDays before submission
      const validExtendDays = Math.max(1, Math.min(30, parseInt(extendDays) || 1));
      
      // Call the extend API endpoint
      const response = await axiosInstance.put(
        `/api/bookings/${rental.booking._id || rental.booking}/extend`,
        { extendDays: validExtendDays },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        const { extension } = response.data.data;
        
        // Close dialog first
        setExtendDialog({ open: false, booking: null });
        setExtendDays(1); // Reset extend days
        
        // Show success toast after dialog closes
        setTimeout(() => {
          toast.success('Rental extended successfully!');
        }, 300); // Small delay to ensure dialog closes smoothly
        
        // Refresh the rentals list to show updated dates
        if (user) {
          const userId = user._id || user.id;
          await getUserBookings(userId);
          await getUserRentals(userId);
          
          // Refresh notifications to show the new extension notification
          await fetchNotifications(userId, true); // isPolling = true to prevent loading spinner
          await fetchUnreadCount(userId);
        }
      }
    } catch (error) {
      console.error('Extension error:', error);
      
      // Handle specific error cases
      if (error.response?.data?.maxExtendDays !== undefined) {
        const maxDays = error.response.data.maxExtendDays;
        const conflictDate = new Date(error.response.data.conflictDate).toLocaleDateString();
        
        if (maxDays > 0) {
          toast.error(
            `Cannot extend for ${extendDays} days due to another booking on ${conflictDate}. ` +
            `Maximum extension: ${maxDays} day(s).`
          );
        } else {
          toast.error(
            `Cannot extend rental. Another booking starts on ${conflictDate}.`
          );
        }
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to extend rental. Please try again.');
      }
    }
  };

  const handleLeaveReview = (booking) => {
    setReviewDialog({ open: true, booking });
  };

  const handleSubmitReview = async () => {
    try {
      const token = localStorage.getItem('token');
      const rental = reviewDialog.booking; // This is actually the rental object
      
      // Extract the correct IDs from the rental object
      // The rental object has 'car' (populated object) not 'carId'
      const rentalId = rental._id;
      const carId = rental.car?._id || rental.car; // car might be populated or just an ID
      
      if (!rentalId || !carId) {
        toast.error('Invalid rental information. Please refresh and try again.');
        return;
      }
      
      // Generate a simple title based on the rating and car
      const title = rating >= 4 
        ? `Great experience with ${rental.car.make} ${rental.car.model}`
        : rating >= 3 
        ? `Good rental of ${rental.car.make} ${rental.car.model}`
        : `My experience with ${rental.car.make} ${rental.car.model}`;
      
      const response = await axiosInstance.post(
        `/api/reviews/cars/${carId}`,
        {
          rentalId: rentalId,
          rating,
          title,  // Added title field
          comment: reviewText || 'No additional comments'  // Provide default if empty
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success('Review submitted successfully!');
      setReviewDialog({ open: false, booking: null });
      setRating(5);
      setReviewText('');
      
      // Add the rental to reviewed rentals set
      setReviewedCars(prev => new Set([...prev, rentalId]));
      
      // Optionally refresh the rentals to show updated review status
      getUserRentals();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleContactSupport = (booking) => {
    toast.info('Redirecting to support...');
    // This would typically open a support chat or form
  };

  const handleGetDirections = (booking) => {
    const location = booking.pickupLocation || 'Main Office';
    const encodedLocation = encodeURIComponent(location);
    window.open(`https://maps.google.com/?q=${encodedLocation}`, '_blank');
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      // Add minimum delay for spinner visibility
      // Pass true/isRefresh parameter to prevent loading skeletons
      await Promise.all([
        getUserBookings(user.id || user._id, true),
        getUserRentals(true),
        fetchReviewedCars(),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      toast?.success('Data refreshed successfully');
    } catch (error) {
      toast?.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !bookings) {
    return <PageLoader message="Loading your current rentals..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ 
      py: { xs: 2, sm: 3, md: 4 },
      px: { xs: 2, sm: 3 },
      minWidth: 0,
      '& > *': {
        minWidth: 0
      }
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 2, sm: 3, md: 4 }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 2, sm: 0 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <DirectionsCarOutlined sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main' }} />
            Current Rentals
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.6,
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
            }}
          >
            Manage your active car rentals and ongoing bookings
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Tooltip title={refreshing ? "Refreshing..." : "Refresh Rentals"}>
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
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
      </Box>

      {/* Current Rentals List */}
      {/* Tabs */}
      <Paper sx={{ mb: { xs: 2, sm: 3 }, borderRadius: 2, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              minHeight: { xs: 48, sm: 56 },
              px: { xs: 1, sm: 2 },
            },
            '& .MuiTab-iconWrapper': {
              fontSize: { xs: 18, sm: 20, md: 24 },
            },
            '& .MuiTabs-scrollButtons': {
              width: { xs: 32, sm: 40 },
              color: 'primary.main',
              display: { xs: 'flex', md: 'none' }, // Only show on mobile/tablet
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            },
          }}
        >
          <Tab 
            label={`All (${stats.total})`}
            icon={<DirectionsCarOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Active (${stats.active})`}
            icon={<CheckCircleOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Completed (${stats.completed})`}
            icon={<CheckCircleOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Cancelled (${stats.cancelled})`}
            icon={<CancelOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Overdue (${stats.overdue})`}
            icon={<ErrorOutlined />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: { xs: 2, sm: 3 }
        }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </Box>
      ) : displayedRentals.length === 0 ? (
        <EmptyRentals onBrowseCars={() => navigate('/cars')} />
      ) : (
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: { xs: 2, sm: 3 },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          {displayedRentals.map((rental) => {
            const progress = calculateProgress(rental);
            const remainingDays = getRemainingDays(rental);
            
            return (
                <Card
                  key={rental._id}
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease-in-out',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: { xs: 'none', md: 'translateY(-2px)' },
                      boxShadow: { xs: theme.shadows[2], md: theme.shadows[8] },
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, flexGrow: 1, boxSizing: 'border-box', overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'flex-start', flexDirection: 'column' }}>
                      {/* Car Image */}
                      <Box sx={{ width: '100%', flexShrink: 0 }}>
                        <Box 
                          sx={{ 
                            position: 'relative', 
                            overflow: 'hidden', 
                            width: '100%',
                            height: { xs: 180, sm: 200, md: 220 }, 
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                          }}
                        >
                          {(rental.car?.imageUrls && rental.car.imageUrls.length > 0) ? (
                            <Box
                              component="img"
                              src={getImageUrl(rental.car.imageUrls[0])}
                              alt={`${rental.car.make} ${rental.car.model}`}
                              sx={{
                                width: '100%',
                                height: '100%',
                                display: 'block',
                                objectFit: 'cover',
                                objectPosition: 'center',
                                transition: 'transform 0.3s ease-in-out',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                },
                              }}
                            />
                          ) : (
                            // Professional car placeholder pattern
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: `linear-gradient(135deg, 
                                  ${theme.palette.grey[100]} 0%, 
                                  ${theme.palette.grey[50]} 50%, 
                                  ${theme.palette.grey[100]} 100%)`,
                                position: 'relative',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: `repeating-linear-gradient(
                                    45deg,
                                    transparent,
                                    transparent 10px,
                                    ${theme.palette.grey[200]} 10px,
                                    ${theme.palette.grey[200]} 11px
                                  )`,
                                  opacity: 0.3,
                                },
                              }}
                            >
                              <DirectionsCarOutlined 
                                sx={{ 
                                  fontSize: { xs: 36, sm: 42, md: 48 }, 
                                  color: 'text.secondary',
                                  zIndex: 1,
                                }} 
                              />
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Rental Details */}
                      <Box sx={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: { xs: 1, sm: 2 }, mb: { xs: 1.5, sm: 2 }, flexWrap: 'wrap' }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 600,
                                mb: { xs: 0.5, sm: 1 },
                                color: 'text.primary',
                                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                              }}
                            >
                              {rental.car?.year} {rental.car?.make} {rental.car?.model}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                              <Chip
                                label={rental.rentalStatus ? `${rental.rentalStatus.charAt(0).toUpperCase() + rental.rentalStatus.slice(1)} Rental` : 'Active Rental'}
                                color={rental.rentalStatus === 'active' ? 'success' : 
                                       rental.rentalStatus === 'completed' ? 'info' : 
                                       rental.rentalStatus === 'overdue' ? 'error' :
                                       rental.rentalStatus === 'cancelled' ? 'error' : 'success'}
                                variant="filled"
                                sx={{ 
                                  fontWeight: 600,
                                  height: { xs: 24, sm: 28, md: 32 },
                                  fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                                }}
                              />
                              
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                {rental.rentalId || formatRentalId(rental._id)}
                              </Typography>
                            </Box>
                          </Box>

                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: 'primary.main',
                              whiteSpace: 'nowrap',
                              fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
                            }}
                          >
                            ₱{(rental.totalRentalFee || rental.booking?.totalPrice || rental.car?.pricePerDay || 0).toLocaleString()}
                          </Typography>
                        </Box>

                        {/* Rental Progress - Only show for active, completed, or overdue rentals */}
                        {rental.rentalStatus !== 'cancelled' && (
                          <Box sx={{ mb: { xs: 2, sm: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                Rental Progress
                              </Typography>
                              <Typography 
                                variant="body2" 
                                fontWeight={500}
                                color={remainingDays === -1 ? 'success.main' : 
                                       remainingDays === null ? 'error.main' : 'text.primary'}
                                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                              >
                                {remainingDays === -1 
                                  ? 'Completed' 
                                  : remainingDays === null
                                  ? 'Cancelled'
                                  : `${remainingDays} day${remainingDays !== 1 ? 's' : ''} remaining`}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{
                                width: '100%',
                                maxWidth: '100%',
                                height: { xs: 6, sm: 8 },
                                borderRadius: 4,
                                bgcolor: alpha(theme.palette.grey[300], 0.3),
                                boxSizing: 'border-box',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 4,
                                  bgcolor: remainingDays === -1 ? 'success.main' : // Completed - green
                                          remainingDays <= 1 ? 'error.main' : // Last day - red
                                          remainingDays <= 3 ? 'warning.main' : // Few days left - yellow
                                          'primary.main', // Normal progress - primary color
                                },
                              }}
                            />
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, mb: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                              <CalendarTodayOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                  Delivery
                                </Typography>
                                <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  {rental.booking ? new Date(rental.booking.startDate).toLocaleDateString() : 'Not available'}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                              <CalendarTodayOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                  Return
                                </Typography>
                                <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  {rental.booking ? new Date(rental.booking.endDate).toLocaleDateString() : 'Not available'}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                              <PaymentOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                  Daily Rate
                                </Typography>
                                <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'nowrap', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  ₱{rental.car?.pricePerDay || 0}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, minWidth: 0, overflow: 'hidden' }}>
                            <LocationOnOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary', flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                Location
                              </Typography>
                              <Typography 
                                variant="body2" 
                                fontWeight={500}
                                sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                }}
                                title={rental.booking?.location || 'Main Office'}
                              >
                                {rental.booking?.location || 'Main Office'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>


                        
                        {/* Car Specifications */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', pl: 50 }}>
                          {rental.car?.fuelType && (
                            <Chip
                              icon={<LocalGasStationOutlined />}
                              label={rental.car.fuelType}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {rental.car?.transmission && (
                            <Chip
                              icon={<SpeedOutlined />}
                              label={rental.car.transmission}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {rental.car?.seats && (
                            <Chip
                              icon={<PeopleOutlined />}
                              label={`${rental.car.seats} seats`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>

                  <Divider />

                  <CardActions sx={{ 
                    p: { xs: 2, sm: 2.5, md: 3 }, 
                    mt: 'auto', 
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, width: '100%' }}>
                      {/* Started on text */}
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          Started on {rental.checkOutDate ? new Date(rental.checkOutDate).toLocaleDateString() : rental.booking?.startDate ? new Date(rental.booking.startDate).toLocaleDateString() : 'Date not available'}
                        </Typography>
                      </Box>

                      {/* Buttons container - below the date */}
                      <Box sx={{ 
                        display: 'flex', 
                        gap: { xs: 1, sm: 1.5 }, 
                        flexWrap: 'wrap', 
                        width: '100%',
                        justifyContent: { xs: 'stretch', sm: 'flex-start' },
                      }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ExtensionOutlined sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                        onClick={() => handleExtendRental(rental)}
                        disabled={rental.rentalStatus !== 'active'}
                        sx={{ 
                          textTransform: 'none', 
                          flex: { xs: 1, sm: 'none' },
                          fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                          py: { xs: 0.75, sm: 1 },
                          px: { xs: 1.5, sm: 2 },
                        }}
                      >
                        Extend
                      </Button>
                      
                      {rental.rentalStatus === 'completed' && (
                         reviewedCars.has(rental._id) ? (
                          <Button
                            size="small"
                            startIcon={<RateReviewOutlined sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                            variant="outlined"
                            disabled
                            sx={{ 
                              textTransform: 'none', 
                              opacity: 0.6, 
                              flex: { xs: 1, sm: 'none' },
                              fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                              py: { xs: 0.75, sm: 1 },
                              px: { xs: 1.5, sm: 2 },
                            }}
                          >
                            {isMobile ? 'Reviewed' : 'Already Reviewed'}
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            startIcon={<RateReviewOutlined sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                            onClick={() => setReviewDialog({ open: true, booking: rental })}
                            variant="outlined"
                            sx={{ 
                              textTransform: 'none', 
                              flex: { xs: 1, sm: 'none' },
                              fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                              py: { xs: 0.75, sm: 1 },
                              px: { xs: 1.5, sm: 2 },
                            }}
                          >
                            {isMobile ? 'Review' : 'Write Review'}
                          </Button>
                        )
                      )}
                      </Box>
                    </Box>
                  </CardActions>
                </Card>
            );
          })}
        </Box>
      )}

      {/* Pagination */}
      {!loading && displayedRentals.length > 0 && totalPages > 1 && (
        <Box ref={paginationRef} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: { xs: 3, sm: 4 }, gap: { xs: 1.5, sm: 2 } }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Showing {Math.min(startIndex + 1, filteredRentals.length)} - {Math.min(endIndex, filteredRentals.length)} of {filteredRentals.length} rentals
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="medium"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: 2,
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minWidth: { xs: 28, sm: 32 },
                height: { xs: 28, sm: 32 },
              },
            }}
          />
        </Box>
      )}

      {/* Extend Rental Dialog */}
      <Dialog open={extendDialog.open} onClose={() => {
        setExtendDialog({ open: false, booking: null });
        setExtendError(''); // Clear error on close
        setExtendDays(1); // Reset to default
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Extend Rental</DialogTitle>
        <DialogContent>
          {extendDialog.booking && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {extendDialog.booking.car?.year} {extendDialog.booking.car?.make} {extendDialog.booking.car?.model}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current end date: {extendDialog.booking.booking?.endDate ? 
                  new Date(extendDialog.booking.booking.endDate).toLocaleDateString() : 
                  'Not available'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Box>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            How many additional days would you like to extend your rental?
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Additional Days"
            type="number"
            fullWidth
            variant="outlined"
            value={extendDays}
            onChange={(e) => {
              const value = e.target.value;
              
              // Allow empty string for editing
              if (value === '') {
                setExtendDays('');
                setExtendError('');
                return;
              }
              
              // Parse the number and enforce limits
              const numValue = parseInt(value);
              
              // If not a valid number, don't update
              if (isNaN(numValue)) {
                return;
              }
              
              // Enforce maximum of 30 days
              if (numValue > 30) {
                setExtendDays(30);
                setExtendError('Maximum extension is 30 days');
                // Clear error after 3 seconds
                setTimeout(() => setExtendError(''), 3000);
              } else if (numValue < 1) {
                setExtendDays(1);
                setExtendError('Minimum extension is 1 day');
                setTimeout(() => setExtendError(''), 3000);
              } else {
                setExtendDays(numValue);
                setExtendError('');
              }
            }}
            inputProps={{ min: 1, max: 30 }}
            error={!!extendError}
            helperText={extendError || "Enter the number of days to extend (1-30 days)"}
          />
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Extension Summary:</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                New end date:
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {extendDialog.booking?.booking?.endDate ? 
                  new Date(new Date(extendDialog.booking.booking.endDate).getTime() + 
                    ((parseInt(extendDays) || 0) * 24 * 60 * 60 * 1000)).toLocaleDateString() : 
                  'Calculate...'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Daily rate:
              </Typography>
              <Typography variant="body2">
                ₱{(extendDialog.booking?.car?.pricePerDay || 0).toLocaleString()}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={600}>
                Additional cost:
              </Typography>
              <Typography variant="body2" fontWeight={600} color="primary">
                ₱{((extendDialog.booking?.car?.pricePerDay || 0) * (parseInt(extendDays) || 0)).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Note: Extension is subject to vehicle availability. If another booking exists for your 
            selected dates, you will be notified of the maximum extension period available.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setExtendDialog({ open: false, booking: null });
            setExtendError(''); // Clear error
            setExtendDays(1); // Reset to default
          }}>
            Cancel
          </Button>
          <Button onClick={handleSubmitExtension} variant="contained" color="primary">
            Confirm Extension
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false, booking: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Leave a Review</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Rate your experience
            </Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => setRating(newValue)}
              size="large"
            />
          </Box>
          <TextField
            margin="dense"
            label="Your Review"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this rental..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog({ open: false, booking: null })}>
            Cancel
          </Button>
          <Button onClick={handleSubmitReview} variant="contained">
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ModernCurrentRentals;

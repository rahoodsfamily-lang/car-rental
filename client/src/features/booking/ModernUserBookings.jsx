import React, { useState, useEffect, useRef } from 'react';
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
  Tab,
  Tabs,
  useTheme,
  alpha,
  IconButton,
  Collapse,
  Pagination,
  Tooltip,
  CircularProgress,
  useMediaQuery,
} from '@mui/material';
import {
  BookOnlineOutlined,
  DirectionsCarOutlined,
  CalendarTodayOutlined,
  LocationOnOutlined,
  PaymentOutlined,
  CancelOutlined,
  EditOutlined,
  VisibilityOutlined,
  CheckCircleOutlined,
  PendingOutlined,
  ErrorOutlined,
  RefreshOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useBooking } from './BookingContext';
import { useAuth } from '../auth/AuthContext';
import { PageLoader, CardSkeleton } from '../../components/feedback/LoadingSpinner';
import { NoBookings } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';
import { getImageUrl } from '../../utils/imageHelper';

import ModernBookingEditModal from './ModernBookingEditModal';
import BookingCancellationDialog from './BookingCancellationDialog';
import { formatBookingId } from '../../utils/formatters';
import { useSocket } from '../../contexts/SocketContext';

const ModernUserBookings = () => {
  const { bookings, loading, getUserBookings, cancelBooking } = useBooking();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // Mobile and tablet
  const [tabValue, setTabValue] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(5); // Show 5 bookings per page
  const [refreshing, setRefreshing] = useState(false);
  const paginationRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { socket } = useSocket();

  useEffect(() => {
    if (user) {
      getUserBookings(user.id || user._id);
    }
  }, [user]);

  // Listen for real-time payment status updates
  useEffect(() => {
    if (!socket || !user) return;

    const handlePaymentUpdate = (data) => {
      console.log('🔔 Payment status updated via socket:', data);
      // Refresh bookings list
      getUserBookings(user.id || user._id);
      // Show toast notification
      if (data.status === 'verified') {
        toast.success('Your payment has been verified! Your booking is confirmed.', {
          position: 'top-right',
          autoClose: 5000
        });
      } else if (data.status === 'rejected') {
        toast.error(`Payment rejected: ${data.message}`, {
          position: 'top-right',
          autoClose: 5000
        });
      }
    };

    socket.on('paymentStatusUpdate', handlePaymentUpdate);

    return () => {
      socket.off('paymentStatusUpdate', handlePaymentUpdate);
    };
  }, [socket, user]);

  // Listen for real-time booking status updates
  useEffect(() => {
    if (!socket || !user) return;

    const handleBookingStatusUpdate = (data) => {
      console.log('🔔 Booking status updated via socket:', data);
      // Refresh bookings list to show updated status
      getUserBookings(user.id || user._id);
      
      // Show toast notification based on status
      if (data.status === 'confirmed') {
        toast.success('Your booking has been confirmed!', {
          position: 'top-right',
          autoClose: 5000
        });
      } else if (data.status === 'active') {
        toast.success('Your rental has started! Enjoy your ride!', {
          position: 'top-right',
          autoClose: 5000
        });
      } else if (data.status === 'cancelled') {
        toast.info('Your booking has been cancelled.', {
          position: 'top-right',
          autoClose: 5000
        });
      } else if (data.status === 'completed') {
        toast.success('Your booking has been completed. Thank you!', {
          position: 'top-right',
          autoClose: 5000
        });
      }
    };

    socket.on('bookingStatusUpdated', handleBookingStatusUpdate);

    return () => {
      socket.off('bookingStatusUpdated', handleBookingStatusUpdate);
    };
  }, [socket, user, getUserBookings, toast]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'active':
        return 'primary'; // Active bookings (currently renting)
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleOutlined />;
      case 'pending':
        return <PendingOutlined />;
      case 'active':
        return <DirectionsCarOutlined />; // Car icon for active rentals
      case 'cancelled':
        return <ErrorOutlined />;
      case 'completed':
        return <CheckCircleOutlined />;
      default:
        return <PendingOutlined />;
    }
  };

  const filterBookingsByStatus = (status) => {
    if (!bookings) return [];
    switch (status) {
      case 'all':
        return bookings;
      case 'pending':
        return bookings.filter(b => b.status === 'pending');
      case 'confirmed':
        return bookings.filter(b => b.status === 'confirmed');
      case 'active':
        return bookings.filter(b => b.status === 'active');
      case 'completed':
        return bookings.filter(b => b.status === 'completed');
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const getTabBookings = () => {
    const statusMap = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];
    const filteredBookings = filterBookingsByStatus(statusMap[tabValue]);
    
    // Apply pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredBookings.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const statusMap = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];
    const filteredBookings = filterBookingsByStatus(statusMap[tabValue]);
    return Math.ceil(filteredBookings.length / itemsPerPage);
  };

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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(1); // Reset to first page when changing tabs
  };

  const getCurrentTabBookings = () => {
    const statusMap = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];
    return filterBookingsByStatus(statusMap[tabValue]);
  };

  const getPaginationInfo = () => {
    const totalBookings = getCurrentTabBookings().length;
    const startIndex = ((page - 1) * itemsPerPage) + 1;
    const endIndex = Math.min(page * itemsPerPage, totalBookings);
    return { startIndex, endIndex, totalBookings };
  };

  const handleCancelBooking = (booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const confirmCancelBooking = async (cancellationReason) => {
    try {
      const result = await cancelBooking(bookingToCancel._id, cancellationReason);
      
      if (result.success) {
        const refundInfo = result.data?.refundInfo;
        
        if (refundInfo && refundInfo.requiresRefund && refundInfo.refundAmount > 0) {
          toast.success(
            `Booking cancelled successfully! Refund of ₱${refundInfo.refundAmount.toLocaleString()} (${refundInfo.refundPercentage}%) will be processed within 3-5 business days.`,
            { duration: 6000 }
          );
        } else if (refundInfo && !refundInfo.requiresRefund) {
          toast.success(`Booking cancelled successfully! ${refundInfo.reason}`);
        } else {
          toast.success('Booking cancelled successfully');
        }
        
        getUserBookings(user.id);
      } else {
        toast.error(result.message || 'Failed to cancel booking');
      }
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleViewDetails = (bookingId) => {
    navigate(`/bookings/${bookingId}`);
  };

  const handleBrowseCars = () => {
    navigate('/cars');
  };

  const handleEditBooking = (booking) => {
    setSelectedBooking(booking);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedBooking(null);
    // Refresh bookings
    getUserBookings(user.id || user._id);
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      // Add minimum delay for spinner visibility
      // Pass true as second parameter to indicate refresh (prevents loading skeleton)
      await Promise.all([
        getUserBookings(user.id || user._id, true),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      toast?.success('Data refreshed successfully');
    } catch (error) {
      toast?.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate statistics for tab labels
  const stats = {
    total: bookings?.length || 0,
    pending: filterBookingsByStatus('pending').length,
    confirmed: filterBookingsByStatus('confirmed').length,
    active: filterBookingsByStatus('active').length,
    completed: filterBookingsByStatus('completed').length,
    cancelled: filterBookingsByStatus('cancelled').length,
  };

  if (loading && !bookings) {
    return <PageLoader message="Loading your bookings..." />;
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
            <BookOnlineOutlined sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main' }} />
            My Bookings
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.6,
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
            }}
          >
            Manage your car reservations and rental history
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Tooltip title={refreshing ? "Refreshing..." : "Refresh Bookings"}>
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
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
            icon={<BookOnlineOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Pending (${stats.pending})`}
            icon={<PendingOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Confirmed (${stats.confirmed})`}
            icon={<CheckCircleOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Active (${stats.active})`}
            icon={<DirectionsCarOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Completed (${stats.completed})`}
            icon={<CheckCircleOutlined />}
            iconPosition="start"
          />
          <Tab 
            label={`Cancelled (${stats.cancelled})`}
            icon={<ErrorOutlined />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Bookings List */}
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
      ) : getTabBookings().length === 0 ? (
        <NoBookings onBrowseCars={handleBrowseCars} />
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
          {getTabBookings().map((booking) => (
              <Card
                key={booking._id}
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
                        {(booking.car?.imageUrls && booking.car.imageUrls.length > 0) ? (
                          <Box
                            component="img"
                            src={getImageUrl(booking.car.imageUrls[0])}
                            alt={`${booking.car.make} ${booking.car.model}`}
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

                    {/* Booking Details */}
                    <Box sx={{ flex: 1 }}>
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
                            {booking.car?.year} {booking.car?.make} {booking.car?.model}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                            <Chip
                              icon={getStatusIcon(booking.status)}
                              label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              color={getStatusColor(booking.status)}
                              variant="filled"
                              sx={{ 
                                fontWeight: 600,
                                height: { xs: 24, sm: 28, md: 32 },
                                fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                                '& .MuiChip-icon': {
                                  fontSize: { xs: 16, sm: 18, md: 20 },
                                },
                              }}
                            />
                            
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                              {booking.bookingId || formatBookingId(booking._id)}
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
                          ₱{booking.totalPrice?.toLocaleString() || booking.totalCost || '—'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, mb: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                            <CalendarTodayOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                Delivery
                              </Typography>
                              <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                {new Date(booking.startDate).toLocaleDateString()}
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
                                {new Date(booking.endDate).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                            <PaymentOutlined sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                Payment
                              </Typography>
                              <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                {booking.paymentStatus || 'Pending'}
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
                              title={booking.pickupLocation || 'Main Office'}
                            >
                              {booking.pickupLocation || 'Main Office'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>

                <Divider />

                <CardActions sx={{ 
                  p: { xs: 2, sm: 2.5, md: 3 }, 
                  mt: 'auto', 
                }}>
                  <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, alignItems: 'stretch', flexDirection: 'column', width: '100%' }}>
                    {/* Booked on text */}
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Booked on {new Date(booking.createdAt).toLocaleDateString()}
                    </Typography>

                    {/* Buttons container */}
                    <Box sx={{ 
                      display: 'flex', 
                      gap: { xs: 1, sm: 1.5 },
                      flexWrap: 'wrap',
                      width: '100%',
                    }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityOutlined sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                            onClick={() => handleViewDetails(booking._id)}
                            sx={{ 
                              flex: { xs: 1, sm: 'none' },
                              fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                              py: { xs: 0.75, sm: 1 },
                              px: { xs: 1.5, sm: 2 },
                            }}
                          >
                            {isMobile ? 'View' : 'View Details'}
                          </Button>

                          {booking.status === 'pending' && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<EditOutlined sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                              onClick={() => handleEditBooking(booking)}
                              sx={{ 
                                flex: { xs: 1, sm: 'none' },
                                fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                                py: { xs: 0.75, sm: 1 },
                                px: { xs: 1.5, sm: 2 },
                              }}
                            >
                              {isMobile ? 'Edit' : 'Modify'}
                            </Button>
                          )}
                          
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<CancelOutlined sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                              onClick={() => handleCancelBooking(booking)}
                              sx={{ 
                                flex: { xs: 1, sm: 'none' },
                                fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                                py: { xs: 0.75, sm: 1 },
                                px: { xs: 1.5, sm: 2 },
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                    </Box>
                  </Box>
                </CardActions>
              </Card>
          ))}
        </Box>
      )}

      {/* Pagination */}
      {!loading && getTabBookings().length > 0 && getTotalPages() > 1 && (
        <Box ref={paginationRef} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: { xs: 3, sm: 4 }, gap: { xs: 1.5, sm: 2 } }}>
          {/* Pagination Info */}
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            {(() => {
              const { startIndex, endIndex, totalBookings } = getPaginationInfo();
              return `Showing ${startIndex} - ${endIndex} of ${totalBookings} bookings`;
            })()}
          </Typography>
          
          {/* Pagination Controls */}
          <Pagination
            count={getTotalPages()}
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

      {/* Edit Booking Modal */}
      <ModernBookingEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        onSuccess={handleEditSuccess}
      />

      {/* Booking Cancellation Dialog */}
      <BookingCancellationDialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setBookingToCancel(null);
        }}
        booking={bookingToCancel}
        onConfirm={confirmCancelBooking}
      />
    </Container>
  );
};

export default ModernUserBookings;

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosConfig';
import { useSocket } from '../../contexts/SocketContext';

import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  alpha,
  Avatar,
  Tooltip,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Divider,
} from '@mui/material';
import {
  BookOnlineOutlined,
  MoreVertOutlined,
  EditOutlined,
  DeleteOutlined,
  VisibilityOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  PendingOutlined,
  SearchOutlined,
  RefreshOutlined,
  DownloadOutlined,
  DirectionsCarOutlined,
  LocationOnOutlined,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { getImageUrl } from '../../utils/imageHelper';
import { useBooking } from '../booking/BookingContext';
import { useRental } from '../rental/RentalContext';
import { useNotifications } from '../notifications/NotificationContext';
import { PageLoader } from '../../components/feedback/LoadingSpinner';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatBookingId } from '../../utils/formatters';

const BookingManager = forwardRef((props, ref) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { bookings, loading, getAllBookings, updateBookingStatus, deleteBooking } = useBooking();
  const { rentals, createRental } = useRental();
  const { fetchNotifications, fetchUnreadCount } = useNotifications();
  const toast = useToast();
  const { socket } = useSocket();
  
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, booking: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, booking: null });
  const [newStatus, setNewStatus] = useState('');
  
  // Check-out dialog state
  const [checkOutDialog, setCheckOutDialog] = useState({ open: false, booking: null });
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [checkOutData, setCheckOutData] = useState({
    checkOutDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Status update loading state
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      getAllBookings();
    }
  }, [user?.role]);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await getAllBookings();
    }
  }));

  // Listen for real-time booking updates
  useEffect(() => {
    if (!socket) return;

    const handleNewBooking = (data) => {
      console.log('🔔 New booking received via socket:', data);
      getAllBookings();
      toast.success('New booking received!', {
        position: 'top-right',
        autoClose: 3000
      });
    };

    socket.on('newBooking', handleNewBooking);

    return () => {
      socket.off('newBooking', handleNewBooking);
    };
  }, [socket]);

  // Debounced search for bookings
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setActiveSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Handle URL parameters to set correct tab
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const bookingTabParam = urlParams.get('bookingTab');
    
    if (bookingTabParam) {
      const bookingTabIndex = parseInt(bookingTabParam, 10);
      if (bookingTabIndex >= 0 && bookingTabIndex <= 5) {
        setTabValue(bookingTabIndex);
      }
    }
  }, [location.search]);

  // Reset pagination when filtered results would be empty on current page
  useEffect(() => {
    const filteredCount = bookings?.filter(booking => {
      const searchTermToUse = activeSearchTerm.toLowerCase();
      const matchesSearch = !searchTermToUse ||
        formatBookingId(booking._id).toLowerCase().includes(searchTermToUse) ||
        `${booking.user?.profile?.firstName} ${booking.user?.profile?.lastName}`.toLowerCase().includes(searchTermToUse) ||
        `${booking.car?.make} ${booking.car?.model}`.toLowerCase().includes(searchTermToUse);

      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

      const matchesTab = (() => {
        switch (tabValue) {
          case 0: return true;
          case 1: return booking.status === 'pending';
          case 2: return booking.status === 'confirmed';
          case 3: return booking.status === 'active';
          case 4: return booking.status === 'completed';
          case 5: return booking.status === 'cancelled';
          default: return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesTab;
    })?.length || 0;

    if (filteredCount > 0 && page * rowsPerPage >= filteredCount) {
      setPage(0);
    }
  }, [bookings, tabValue, activeSearchTerm, statusFilter, page, rowsPerPage]);

  // Filter bookings based on tab and search
  const filteredBookings = bookings?.filter(booking => {
    const searchTermToUse = activeSearchTerm.toLowerCase();
    const bookingId = (booking.bookingId || formatBookingId(booking._id)).toLowerCase();
    
    const matchesSearch = !searchTermToUse ||
      bookingId.includes(searchTermToUse) ||
      bookingId.replace('bkg-', '').includes(searchTermToUse.replace('bkg-', '')) ||
      booking._id.toLowerCase().includes(searchTermToUse) ||
      `${booking.user?.profile?.firstName} ${booking.user?.profile?.lastName}`.toLowerCase().includes(searchTermToUse) ||
      `${booking.car?.make} ${booking.car?.model}`.toLowerCase().includes(searchTermToUse);

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    const matchesTab = (() => {
      switch (tabValue) {
        case 0: return true;
        case 1: return booking.status === 'pending';
        case 2: return booking.status === 'confirmed';
        case 3: return booking.status === 'active';
        case 4: return booking.status === 'completed';
        case 5: return booking.status === 'cancelled';
        default: return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesTab;
  }) || [];

  // Paginated bookings
  const paginatedBookings = filteredBookings.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Booking Tab Statistics
  const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
  const convertedBookings = rentals?.filter(r => 
    confirmedBookings.some(b => b._id === r.booking?._id || b._id === r.booking)
  ).length || 0;
  
  // Calculate today's checkouts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayCheckouts = confirmedBookings.filter(b => {
    const pickupDate = new Date(b.pickupDate);
    pickupDate.setHours(0, 0, 0, 0);
    return pickupDate.getTime() === today.getTime();
  }).length;
  
  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.status === 'pending').length || 0,
    confirmed: confirmedBookings.length,
    active: bookings?.filter(b => b.status === 'active').length || 0,
    completed: completedBookings.length,
    cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
    convertedToRentals: convertedBookings,
    conversionRate: confirmedBookings.length > 0 ? ((convertedBookings / confirmedBookings.length) * 100).toFixed(1) : 0,
    todayCheckouts: todayCheckouts,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'active': return 'primary';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircleOutlined fontSize="small" />;
      case 'pending': return <PendingOutlined fontSize="small" />;
      case 'active': return <DirectionsCarOutlined fontSize="small" />;
      case 'cancelled': return <CancelOutlined fontSize="small" />;
      case 'completed': return <CheckCircleOutlined fontSize="small" />;
      default: return <PendingOutlined fontSize="small" />;
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getFilteredBookingsCount = () => {
    return filteredBookings.length;
  };

  const handleMenuClick = (event, booking) => {
    setAnchorEl(event.currentTarget);
    setSelectedBooking(booking);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBooking(null);
  };

  const handleViewDetails = () => {
    if (selectedBooking) {
      navigate(`/bookings/${selectedBooking._id}`);
    }
    handleMenuClose();
  };

  const handleEditBooking = () => {
    setEditDialog({ open: true, booking: selectedBooking });
    setNewStatus(selectedBooking.status);
    setStatusUpdateLoading(false);
    handleMenuClose();
  };

  const handleDeleteBooking = () => {
    setDeleteDialog({ open: true, booking: selectedBooking });
    handleMenuClose();
  };
  
  // Check-out functions
  const handleCheckOutBooking = () => {
    setCheckOutDialog({ open: true, booking: selectedBooking });
    setCheckOutData({
      checkOutDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    handleMenuClose();
  };
  
  const handleCheckOutDataChange = (field, value) => {
    setCheckOutData({
      ...checkOutData,
      [field]: value
    });
  };
  
  const handleSubmitCheckOut = async () => {
    setCheckOutLoading(true);
    try {
      await createRental(
        checkOutDialog.booking._id,
        new Date(checkOutData.checkOutDate),
        checkOutData.notes,
        () => {
          if (user && fetchNotifications) {
            const userId = user._id || user.id;
            fetchNotifications(userId, true);
            fetchUnreadCount(userId);
          }
        }
      );
      
      toast.success('Car checked out successfully! Rental has started.');
      setCheckOutDialog({ open: false, booking: null });
      
      // Refresh data in background
      Promise.all([
        getAllBookings()
      ]).catch(error => {
        console.warn('Background refresh failed:', error);
      });
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to check out car';
      toast.error(errorMessage);
    } finally {
      setCheckOutLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (statusUpdateLoading) return;
    
    try {
      setStatusUpdateLoading(true);
      const result = await updateBookingStatus(editDialog.booking._id, newStatus);
      
      if (result.success) {
        toast.success('Booking status updated successfully');
        setEditDialog({ open: false, booking: null });
        setNewStatus('');
        
        if (newStatus === 'confirmed') {
          setTimeout(() => {
            getAllBookings();
          }, 500);
        }
      } else {
        toast.error(result.message || 'Failed to update booking status');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update booking status';
      toast.error(errorMessage);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteBooking(deleteDialog.booking._id);
      toast.success('Booking deleted successfully');
      setDeleteDialog({ open: false, booking: null });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete booking';
      toast.error(errorMessage);
    }
  };

  const handleExportData = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('type', 'bookings');
      queryParams.append('format', 'pdf');
      
      if (statusFilter && statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (searchTerm) queryParams.append('search', searchTerm);
      if (tabValue > 0) {
        const statusMap = { 1: 'pending', 2: 'confirmed', 3: 'active', 4: 'completed', 5: 'cancelled' };
        if (statusMap[tabValue]) queryParams.append('tabStatus', statusMap[tabValue]);
      }

      const response = await axiosInstance.get(`/api/admin/export-data?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `bookings_report_${new Date().toISOString().split('T')[0]}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast.success('Booking report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  if (loading && !bookings) {
    return <PageLoader message="Loading bookings data..." />;
  }

  if (user?.role !== 'admin') {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" color="error" textAlign="center">
          Access Denied - Admin Only
        </Typography>
      </Container>
    );
  }

  return (
    <Box>

      {/* Search Bookings */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2 }, p: { xs: 1.5, sm: 2 }, borderRadius: { xs: 1, sm: 2 } }}>
        <Box sx={{ maxWidth: { xs: '100%', sm: '500px' } }}>
          <TextField
            fullWidth
            placeholder="Search bookings... (BKG-12345, Customer, Vehicle)"
            sx={{
              width: '100%',
              '& .MuiInputBase-input': {
                width: '100%',
                minWidth: 0,
              },
              '& .MuiInputBase-input::placeholder': {
                opacity: 0.7,
                whiteSpace: 'nowrap',
              },
              '& .MuiOutlinedInput-root': {
                width: '100%',
              },
              '& .MuiInputBase-root': {
                width: '100%',
              },
            }}
            value={searchTerm}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchTerm(newValue);
              if (newValue === '') {
                setActiveSearchTerm('');
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchTerm('');
                      setActiveSearchTerm('');
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {/* Sub Tabs */}
      <Paper sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => {
            setTabValue(newValue);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              minHeight: { xs: 48, sm: 56 },
              px: { xs: 1.5, sm: 2 },
            },
          }}
        >
          <Tab label={`All (${stats.total})`} />
          <Tab label={`Pending (${stats.pending || 0})`} />
          <Tab label={`Confirmed (${stats.confirmed || 0})`} />
          <Tab label={`Active (${stats.active || 0})`} />
          <Tab label={`Completed (${stats.completed})`} />
          <Tab label={`Cancelled (${stats.cancelled})`} />
        </Tabs>
      </Paper>

      {/* Booking Table/Cards */}
      {paginatedBookings.length === 0 ? (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: alpha(theme.palette.grey[50], 0.5),
              borderRadius: 0
            }}
          >
            <DirectionsCarOutlined
              sx={{
                fontSize: 64,
                color: 'text.secondary',
                mb: 2,
              }}
            />
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
              {(() => {
                const hasDataForTab = bookings?.some(booking => {
                  switch (tabValue) {
                    case 0: return true;
                    case 1: return booking.status === 'pending';
                    case 2: return booking.status === 'confirmed';
                    case 3: return booking.status === 'active';
                    case 4: return booking.status === 'completed';
                    case 5: return booking.status === 'cancelled';
                    default: return true;
                  }
                });
                
                if (!bookings || bookings.length === 0) {
                  return 'No bookings yet';
                } else if (activeSearchTerm || statusFilter !== 'all') {
                  return 'No search results';
                } else if (!hasDataForTab) {
                  const tabNames = ['', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];
                  return `No ${tabNames[tabValue]} bookings`;
                } else {
                  return 'No search results';
                }
              })()}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              {(() => {
                const hasDataForTab = bookings?.some(booking => {
                  switch (tabValue) {
                    case 0: return true;
                    case 1: return booking.status === 'pending';
                    case 2: return booking.status === 'confirmed';
                    case 3: return booking.status === 'active';
                    case 4: return booking.status === 'completed';
                    case 5: return booking.status === 'cancelled';
                    default: return true;
                  }
                });
                
                if (!bookings || bookings.length === 0) {
                  return 'Bookings will appear here once customers make reservations.';
                } else if (activeSearchTerm || statusFilter !== 'all') {
                  return 'Try adjusting your search criteria to find more results.';
                } else if (!hasDataForTab) {
                  return 'There are no bookings with this status.';
                } else {
                  return 'Try adjusting your search criteria or filters to find more results.';
                }
              })()}
            </Typography>
            {(activeSearchTerm || statusFilter !== 'all') && bookings && bookings.length > 0 && (
              <Button
                variant="contained"
                onClick={() => {
                  setSearchTerm('');
                  setActiveSearchTerm('');
                  setStatusFilter('all');
                  setTabValue(0);
                }}
                startIcon={<RefreshOutlined />}
              >
                Clear All Filters
              </Button>
            )}
          </Paper>
        ) : isMobile || isTablet ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paginatedBookings.map((booking) => (
              <Card key={booking._id} sx={{ p: 0, '&:hover': { boxShadow: theme.shadows[4] } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Booking ID
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {booking.bookingId || formatBookingId(booking._id)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        icon={getStatusIcon(booking.status)}
                        label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        color={getStatusColor(booking.status)}
                        size="small"
                        variant="filled"
                      />
                      <IconButton
                        onClick={(e) => handleMenuClick(e, booking)}
                        size="small"
                      >
                        <MoreVertOutlined />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Customer
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar 
                          src={getImageUrl(booking.user?.profile?.profilePicture)}
                          sx={{ 
                            width: 32, 
                            height: 32,
                            bgcolor: booking.user?.profile?.profilePicture ? 'transparent' : alpha(theme.palette.primary.main, 0.9),
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            color: 'white',
                          }}
                        >
                          {!booking.user?.profile?.profilePicture && (
                            booking.user?.profile?.firstName && booking.user?.profile?.lastName
                              ? `${booking.user.profile.firstName.charAt(0)}${booking.user.profile.lastName.charAt(0)}`.toUpperCase()
                              : booking.user?.email?.charAt(0).toUpperCase() || 'U'
                          )}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {booking.user?.profile?.firstName} {booking.user?.profile?.lastName}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}
                            title={booking.user?.email}
                          >
                            {booking.user?.email}
                          </Typography>
                        </Box>
                      </Box>
                      {(booking.location || booking.pickupLocation) && (
                        <Typography 
                          variant="caption" 
                          color="primary.main" 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5, 
                            mt: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                          onClick={() => {
                            if (booking.latitude && booking.longitude) {
                              // Use precise coordinates for accurate location with marker
                              window.open(
                                `https://www.google.com/maps?q=${booking.latitude},${booking.longitude}`,
                                '_blank'
                              );
                            } else {
                              // Fallback to address search if coordinates not available
                              const location = booking.location || booking.pickupLocation;
                              if (location) {
                                const encodedLocation = encodeURIComponent(location);
                                window.open(
                                  `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
                                  '_blank'
                                );
                              }
                            }
                          }}
                        >
                          <LocationOnOutlined sx={{ fontSize: 14 }} />
                          {booking.location || booking.pickupLocation}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Vehicle
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <DirectionsCarOutlined sx={{ color: 'primary.main', fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {booking.car?.year} {booking.car?.make} {booking.car?.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ₱{booking.car?.pricePerDay}/day
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Rental Period
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {new Date(booking.startDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        to {new Date(booking.endDate).toLocaleDateString()}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="primary.main">
                        ₱{booking.totalPrice?.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper sx={{ borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Booking ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBookings.map((booking) => (
                  <TableRow key={booking._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {booking.bookingId || formatBookingId(booking._id)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          src={getImageUrl(booking.user?.profile?.profilePicture)}
                          sx={{ 
                            width: 40, 
                            height: 40,
                            bgcolor: booking.user?.profile?.profilePicture ? 'transparent' : alpha(theme.palette.primary.main, 0.9),
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: 'white',
                            boxShadow: theme.shadows[2],
                            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          }}
                        >
                          {!booking.user?.profile?.profilePicture && (
                            booking.user?.profile?.firstName && booking.user?.profile?.lastName
                              ? `${booking.user.profile.firstName.charAt(0)}${booking.user.profile.lastName.charAt(0)}`.toUpperCase()
                              : booking.user?.email?.charAt(0).toUpperCase() || 'U'
                          )}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {booking.user?.profile?.firstName} {booking.user?.profile?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {booking.user?.email}
                          </Typography>
                          {(booking.location || booking.pickupLocation) && (
                            <Typography 
                              variant="caption" 
                              color="primary.main" 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 0.5, 
                                mt: 0.5,
                                cursor: 'pointer',
                               '&:hover': {
                                 textDecoration: 'underline'
                               }
                             }}
                             onClick={() => {
                               if (booking.latitude && booking.longitude) {
                                 // Use precise coordinates for accurate location with marker
                                 window.open(
                                   `https://www.google.com/maps?q=${booking.latitude},${booking.longitude}`,
                                   '_blank'
                                 );
                               } else {
                                 // Fallback to address search if coordinates not available
                                 const location = booking.pickupLocation || booking.location;
                                 if (location) {
                                   const encodedLocation = encodeURIComponent(location);
                                   window.open(
                                     `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
                                     '_blank'
                                   );
                                 }
                               }
                             }}
                           >
                              <LocationOnOutlined sx={{ fontSize: 14 }} />
                              {booking.pickupLocation || booking.location}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <DirectionsCarOutlined sx={{ color: 'primary.main', fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {booking.car?.year} {booking.car?.make} {booking.car?.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ₱{booking.car?.pricePerDay}/day
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {new Date(booking.startDate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          to {new Date(booking.endDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(booking.status)}
                        label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        color={getStatusColor(booking.status)}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        ₱{booking.totalPrice?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuClick(e, booking)}
                        size="small"
                      >
                        <MoreVertOutlined />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          </Paper>
        )}
      
      <TablePagination
        component="div"
        count={filteredBookings.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Bookings per page:"
        showFirstButton
        showLastButton
        sx={{
          '& .MuiTablePagination-toolbar': {
            flexWrap: 'wrap',
            minHeight: { xs: 52, sm: 64 },
            px: { xs: 1, sm: 2 },
            justifyContent: 'flex-end',
          },
          '& .MuiTablePagination-spacer': {
            flex: '1 1 100%',
          },
          '& .MuiTablePagination-selectLabel': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            display: { xs: 'none', sm: 'block' },
          },
          '& .MuiTablePagination-displayedRows': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
          '& .MuiTablePagination-select': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
          '& .MuiIconButton-root': {
            padding: { xs: '4px', sm: '8px' },
          },
        }}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && Boolean(selectedBooking)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <VisibilityOutlined sx={{ mr: 1, fontSize: 18 }} />
          View Details
        </MenuItem>
        {selectedBooking?.status === 'confirmed' && (
          <MenuItem onClick={handleCheckOutBooking} sx={{ color: 'success.main' }}>
            <CheckCircleOutlined sx={{ mr: 1, fontSize: 18 }} />
            Check Out
          </MenuItem>
        )}
        {selectedBooking && selectedBooking.status !== 'completed' && selectedBooking.status !== 'cancelled' && (
          <MenuItem onClick={handleEditBooking}>
            <EditOutlined sx={{ mr: 1, fontSize: 18 }} />
            Edit Status
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteBooking} sx={{ color: 'error.main' }}>
          <DeleteOutlined sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>

        {/* Edit Status Dialog */}
          <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, booking: null })}>
            <DialogTitle>Update Booking Status</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Update the status for booking {formatBookingId(editDialog.booking?._id)}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newStatus}
                  label="Status"
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setEditDialog({ open: false, booking: null })}
                disabled={statusUpdateLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStatus} 
                variant="contained"
                disabled={statusUpdateLoading || !newStatus || newStatus === editDialog.booking?.status}
              >
                {statusUpdateLoading ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogActions>
          </Dialog>
    
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, booking: null })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete booking {formatBookingId(deleteDialog.booking?._id)}? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, booking: null })}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check Out Dialog */}
      <Dialog open={checkOutDialog.open} onClose={() => setCheckOutDialog({ open: false, booking: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Check Out Vehicle</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start rental for {checkOutDialog.booking?.car?.make} {checkOutDialog.booking?.car?.model} - {checkOutDialog.booking?.user?.email}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Check Out Date"
                type="date"
                value={checkOutData.checkOutDate}
                onChange={(e) => handleCheckOutDataChange('checkOutDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={checkOutData.notes}
                onChange={(e) => handleCheckOutDataChange('notes', e.target.value)}
                placeholder="Any special notes about the vehicle condition or check-out process..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCheckOutDialog({ open: false, booking: null })}
            disabled={checkOutLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitCheckOut} 
            variant="contained" 
            color="success"
            disabled={checkOutLoading}
          >
            {checkOutLoading ? 'Starting Rental...' : 'Start Rental'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default BookingManager;
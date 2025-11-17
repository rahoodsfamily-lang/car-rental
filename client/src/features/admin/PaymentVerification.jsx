import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
  Avatar
} from '@mui/material';
import { CheckCircle, Cancel, Visibility, Close, PaymentOutlined, PhotoCameraOutlined, MoreVertOutlined, CheckCircleOutlined, CancelOutlined, SearchOutlined, Clear as ClearIcon } from '@mui/icons-material';
import axios from '../../utils/axiosConfig';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../components/feedback/ToastProvider';

const PaymentVerification = forwardRef((props, ref) => {
  const theme = useTheme();
  
  // Mobile responsiveness
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [verifying, setVerifying] = useState(false);
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { socket } = useSocket();
  const toast = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  // Listen for real-time payment updates
  useEffect(() => {
    if (!socket) return;

    let refreshTimeout;
    const handleNewPayment = (data) => {
      console.log('🔔 New payment received via socket:', data);
      // Debounce refresh to avoid multiple rapid calls
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        fetchPayments();
      }, 500);
      // Show notification
      toast.info('New payment submission received!');
    };

    socket.on('newPayment', handleNewPayment);

    return () => {
      clearTimeout(refreshTimeout);
      socket.off('newPayment', handleNewPayment);
    };
  }, [socket]);

  useEffect(() => {
    let filtered = payments;
    
    // Tab filtering
    if (tabValue === 0) {
      // All payments
      filtered = payments;
    } else if (tabValue === 1) {
      // Pending
      filtered = payments.filter(p => p.status === 'pending');
    } else if (tabValue === 2) {
      // Verified
      filtered = payments.filter(p => p.status === 'verified');
    } else if (tabValue === 3) {
      // Rejected
      filtered = payments.filter(p => p.status === 'rejected');
    }
    
    // Search filtering
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      // Remove commas and periods from search term for price matching
      const searchNumber = search.replace(/[,\.]/g, '');
      
      filtered = filtered.filter(p => {
        // User name and email
        const matchesUser = 
          p.user?.profile?.firstName?.toLowerCase().includes(search) ||
          p.user?.profile?.lastName?.toLowerCase().includes(search) ||
          p.user?.email?.toLowerCase().includes(search);
        
        // Booking ID (check both bookingId field and _id)
        const matchesBooking = 
          p.booking?.bookingId?.toLowerCase().includes(search) ||
          p.booking?._id?.toLowerCase().includes(search);
        
        // Amount (remove commas/periods from amount for comparison)
        const amountString = p.amount?.toString().replace(/[,\.]/g, '') || '';
        const matchesAmount = amountString.includes(searchNumber);
        
        return matchesUser || matchesBooking || matchesAmount;
      });
    }
    
    setFilteredPayments(filtered);
    // Reset to first page when filters change
    setPage(0);
  }, [tabValue, payments, searchTerm]);

  // Debounced search - updates 500ms after user stops typing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: fetchPayments
  }));

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/payments/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure data is always an array
      const paymentsArray = Array.isArray(data) ? data : (data?.payments || data?.data || []);
      console.log('Fetched payments:', paymentsArray.length, 'payments');
      setPayments(paymentsArray);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]); // Set empty array on error
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${path.replace(/\\/g, '/')}`;
  };

  const handleMenuOpen = (event, payment) => {
    setAnchorEl(event.currentTarget);
    setSelectedPayment(payment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleView = () => {
    setDialogOpen(true);
    setRejectionReason('');
    handleMenuClose();
  };

  const handleQuickApprove = async () => {
    if (verifying) return; // Prevent multiple clicks
    
    try {
      setVerifying(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/payments/${selectedPayment._id}/verify`,
        { status: 'verified' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Payment approved successfully!');
      fetchPayments();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    } finally {
      setVerifying(false);
    }
    handleMenuClose();
  };

  const handleReject = () => {
    setDialogOpen(true);
    setRejectionReason('');
    handleMenuClose();
  };

  const handleVerify = async (status) => {
    if (verifying) return; // Prevent multiple clicks
    
    try {
      setVerifying(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/payments/${selectedPayment._id}/verify`,
        {
          status,
          rejectionReason: status === 'rejected' ? rejectionReason : null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(`Payment ${status === 'verified' ? 'approved' : 'rejected'} successfully!`);
      setDialogOpen(false);
      fetchPayments();
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to update payment status');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'verified':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'success'; // Green for cash
      case 'gcash':
        return 'primary'; // Blue for GCash
      case 'paymaya':
        return 'secondary'; // Orange/Amber for PayMaya
      default:
        return 'default';
    }
  };

  // Pagination functions
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate paginated payments
  const paginatedPayments = filteredPayments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Search */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ maxWidth: '350px' }}>
          <TextField
            fullWidth
            placeholder="Search payments by user or amount"
            value={searchInput}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchInput(newValue);
              if (newValue === '') {
                setSearchTerm('');
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined />
                </InputAdornment>
              ),
              endAdornment: searchInput && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
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

      {/* Payment Status Tabs */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2 }, borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': { 
              textTransform: 'none', 
              fontWeight: 500, 
              fontSize: { xs: '0.875rem', sm: '1rem' },
              minHeight: { xs: 48, sm: 56 },
              py: { xs: 1, sm: 1.5 },
            },
          }}
        >
          <Tab label={`All (${payments.length})`} />
          <Tab label={`Pending (${payments.filter(p => p.status === 'pending').length})`} />
          <Tab label={`Verified (${payments.filter(p => p.status === 'verified').length})`} />
          <Tab label={`Rejected (${payments.filter(p => p.status === 'rejected').length})`} />
        </Tabs>
      </Paper>

      {/* Payment Display - Responsive */}
      {isMobile || isTablet ? (
        // Mobile/Tablet Card Layout
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredPayments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <PaymentOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
                {(() => {
                  // Check if there's any data for the current tab
                  const hasDataForTab = payments?.some(payment => {
                    switch (tabValue) {
                      case 0: return true; // All
                      case 1: return payment.status === 'pending';
                      case 2: return payment.status === 'verified';
                      case 3: return payment.status === 'rejected';
                      default: return true;
                    }
                  });
                  
                  if (!payments || payments.length === 0) {
                    return 'No payment submissions';
                  } else if (searchTerm) {
                    return 'No search results';
                  } else if (!hasDataForTab) {
                    const tabNames = ['', 'pending', 'verified', 'rejected'];
                    return `No ${tabNames[tabValue]} payments`;
                  } else {
                    return 'No payments found';
                  }
                })()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                {(() => {
                  if (!payments || payments.length === 0) {
                    return 'Payment submissions will appear here once customers upload proof of payment.';
                  } else if (searchTerm) {
                    return 'Try adjusting your search criteria to find more results.';
                  } else {
                    return 'There are no payments with this status.';
                  }
                })()}
              </Typography>
              {searchTerm && payments && payments.length > 0 && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                  }}
                  startIcon={<ClearIcon />}
                >
                  Clear Search
                </Button>
              )}
            </Paper>
          ) : (
            paginatedPayments.map((payment) => (
              <Card key={payment._id} sx={{ p: 0, '&:hover': { boxShadow: theme.shadows[4] } }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={2}>
                    {/* Payment Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                          <PaymentOutlined />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            ₱{payment.amount.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton onClick={(e) => handleMenuOpen(e, payment)} size="small">
                        <MoreVertOutlined />
                      </IconButton>
                    </Box>
                    
                    <Divider />
                    
                    {/* Customer and Booking Info */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Customer
                        </Typography>
                        <Typography variant="body2">
                          {payment.user?.profile?.firstName && payment.user?.profile?.lastName
                            ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}`
                            : payment.user?.email || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Booking ID
                        </Typography>
                        <Typography variant="body2">
                          {payment.booking?.bookingId || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    {/* Method and Status */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Payment Method
                        </Typography>
                        <Chip 
                          label={payment.paymentMethod.toUpperCase()} 
                          color={getPaymentMethodColor(payment.paymentMethod)}
                          size="small" 
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Status
                        </Typography>
                        <Chip
                          label={payment.status.toUpperCase()}
                          color={getStatusColor(payment.status)}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      ) : (
        // Desktop Table Layout
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Booking ID</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
                    <Paper
                      sx={{
                        p: 6,
                        textAlign: 'center',
                        bgcolor: 'background.default',
                        borderRadius: 0
                      }}
                    >
                      <PaymentOutlined
                        sx={{
                          fontSize: 64,
                          color: 'text.secondary',
                          mb: 2,
                        }}
                      />
                      <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
                        {(() => {
                          // Check if there's any data for the current tab
                          const hasDataForTab = payments?.some(payment => {
                            switch (tabValue) {
                              case 0: return true; // All
                              case 1: return payment.status === 'pending';
                              case 2: return payment.status === 'verified';
                              case 3: return payment.status === 'rejected';
                              default: return true;
                            }
                          });
                          
                          if (!payments || payments.length === 0) {
                            return 'No payment submissions';
                          } else if (searchTerm) {
                            return 'No search results';
                          } else if (!hasDataForTab) {
                            const tabNames = ['', 'pending', 'verified', 'rejected'];
                            return `No ${tabNames[tabValue]} payments`;
                          } else {
                            return 'No payments found';
                          }
                        })()}
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                        {(() => {
                          if (!payments || payments.length === 0) {
                            return 'Payment submissions will appear here once customers upload proof of payment.';
                          } else if (searchTerm) {
                            return 'Try adjusting your search criteria to find more results.';
                          } else {
                            return 'There are no payments with this status.';
                          }
                        })()}
                      </Typography>
                      {searchTerm && payments && payments.length > 0 && (
                        <Button
                          variant="contained"
                          onClick={() => {
                            setSearchInput('');
                            setSearchTerm('');
                          }}
                          startIcon={<ClearIcon />}
                        >
                          Clear Search
                        </Button>
                      )}
                    </Paper>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {payment.user?.profile?.firstName && payment.user?.profile?.lastName
                        ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}`
                        : payment.user?.email || 'N/A'}
                    </TableCell>
                    <TableCell>{payment.booking?.bookingId || 'N/A'}</TableCell>
                    <TableCell>₱{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.paymentMethod.toUpperCase()} 
                        color={getPaymentMethodColor(payment.paymentMethod)}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status.toUpperCase()}
                        color={getStatusColor(payment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, payment)}
                      >
                        <MoreVertOutlined />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <TablePagination
        component="div"
        count={filteredPayments.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Payments per page:"
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

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility sx={{ mr: 1, fontSize: 20 }} />
          View Details
        </MenuItem>
        {selectedPayment?.status === 'pending' && (
          <>
            <MenuItem onClick={handleQuickApprove}>
              <CheckCircleOutlined sx={{ mr: 1, fontSize: 20, color: 'success.main' }} />
              Approve
            </MenuItem>
            <MenuItem onClick={handleReject}>
              <CancelOutlined sx={{ mr: 1, fontSize: 20, color: 'error.main' }} />
              Reject
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Payment Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={(theme) => theme.breakpoints.down('sm')} // Full screen on mobile
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2 }, // No border radius on mobile (full screen)
            boxShadow: 24,
            width: { xs: '100%', sm: '90%', md: '100%' }, // Increased tablet width
            maxWidth: { xs: '100%', sm: '90vw', md: '800px' }, // Fixed max width for desktop
            height: { xs: '100%', sm: 'auto' }, // Mobile: full height, others: auto
            maxHeight: { xs: '100%', sm: '90vh', md: '85vh' }, // Prevent overflow
            margin: { xs: 0, sm: 'auto' }, // Center on larger screens
          }
        }}
      >
        {selectedPayment && (
          <>
            <DialogTitle sx={{ 
              bgcolor: (theme) => `${theme.palette.primary.main}08`,
              borderBottom: 1,
              borderColor: 'divider',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Payment Details</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={selectedPayment.status.toUpperCase()}
                    color={getStatusColor(selectedPayment.status)}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                  <IconButton 
                    onClick={() => setDialogOpen(false)} 
                    size="small"
                    sx={{ 
                      color: 'grey.600',
                      '&:hover': { bgcolor: (theme) => `${theme.palette.grey[500]}1A` }
                    }}
                  >
                    <Close />
                  </IconButton>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent 
              dividers
              sx={{
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: { xs: 2, sm: 3 }, // Responsive padding
                minHeight: 0, // Allow content to shrink
                flex: 1, // Take available space
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.3)' }
                }
              }}
            >
              {/* Payment Information Section */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PaymentOutlined sx={{ color: 'primary.main' }} />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      color: 'primary.main',
                      fontSize: '1.1rem'
                    }}
                  >
                    Payment Information
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Customer
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                      {selectedPayment.user?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPayment.user?.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Amount
                    </Typography>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                      ₱{selectedPayment.amount.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Payment Method
                    </Typography>
                    <Chip
                      label={selectedPayment.paymentMethod.toUpperCase()}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Grid>
                  {selectedPayment.referenceNumber && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Reference Number
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedPayment.referenceNumber}
                      </Typography>
                    </Grid>
                  )}
                  {selectedPayment.notes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Notes
                      </Typography>
                      <Typography variant="body1">
                        {selectedPayment.notes}
                      </Typography>
                    </Grid>
                  )}
                  {selectedPayment.status === 'rejected' && selectedPayment.rejectionReason && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Rejection Reason
                      </Typography>
                      <Typography variant="body1" color="error">
                        {selectedPayment.rejectionReason}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>

              {/* Payment Proof Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PhotoCameraOutlined sx={{ color: 'primary.main' }} />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      color: 'primary.main',
                      fontSize: '1.1rem'
                    }}
                  >
                    Payment Proof
                  </Typography>
                </Box>
                {selectedPayment.paymentProof ? (
                  <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <CardMedia
                      component="img"
                      image={getImageUrl(selectedPayment.paymentProof)}
                      alt="Payment Proof"
                      sx={{ height: 400, objectFit: 'contain', bgcolor: 'grey.50' }}
                      onError={(e) => {
                        console.error('Failed to load payment proof image:', {
                          originalPath: selectedPayment.paymentProof,
                          computedUrl: getImageUrl(selectedPayment.paymentProof)
                        });
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div style="padding: 40px; text-align: center; color: #666;">
                            <p style="margin-bottom: 10px;">⚠️ Failed to load payment proof image</p>
                            <p style="font-size: 12px; color: #999;">Path: ${selectedPayment.paymentProof}</p>
                            <p style="font-size: 12px; color: #999;">URL: ${getImageUrl(selectedPayment.paymentProof)}</p>
                          </div>
                        `;
                      }}
                    />
                  </Card>
                ) : (
                  <Typography color="text.secondary">No proof uploaded</Typography>
                )}
              </Box>

              {/* Rejection Reason Field */}
              {selectedPayment.status === 'pending' && (
                <Box sx={{ mt: 3 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Rejection Reason (if rejecting)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                  />
                </Box>
              )}
            </DialogContent>
            {selectedPayment.status === 'pending' && (
              <DialogActions sx={{ p: 3 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => handleVerify('rejected')}
                  disabled={!rejectionReason || verifying}
                >
                  {verifying ? 'Processing...' : 'Reject'}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => handleVerify('verified')}
                  disabled={verifying}
                >
                  {verifying ? 'Processing...' : 'Approve'}
                </Button>
              </DialogActions>
            )}
          </>
        )}
      </Dialog>
    </Box>
  );
});

export default PaymentVerification;

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  DirectionsCarOutlined,
  MoreVertOutlined,
  EditOutlined,
  VisibilityOutlined,
  PrintOutlined,
  SearchOutlined,
  RefreshOutlined,
  DownloadOutlined,
  NotesOutlined,
  LocationOnOutlined,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useRental } from '../rental/RentalContext';
import { useNotifications } from '../notifications/NotificationContext';
import { PageLoader } from '../../components/feedback/LoadingSpinner';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatRentalId } from '../../utils/formatters';

const RentalManager = forwardRef((props, ref) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { rentals, getAllRentals, updateRentalStatus, loading: rentalLoading } = useRental();
  const { fetchNotifications, fetchUnreadCount } = useNotifications();
  const toast = useToast();
  const { socket } = useSocket();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rentalTabValue, setRentalTabValue] = useState(0);
  const [rentalFilters, setRentalFilters] = useState({
    searchTerm: '',
    searchTrigger: 0
  });
  const [activeRentalSearch, setActiveRentalSearch] = useState('');
  const [selectedRental, setSelectedRental] = useState(null);
  const [rentalAnchorEl, setRentalAnchorEl] = useState(null);
  const [rentalUpdateDialog, setRentalUpdateDialog] = useState({ open: false, rental: null });
  const [rentalUpdateLoading, setRentalUpdateLoading] = useState(false);
  const [rentalUpdateData, setRentalUpdateData] = useState({
    rentalStatus: '',
    lateFee: 0,
    damageFee: 0,
    notes: ''
  });
  const [refreshing, setRefreshing] = useState(false);

  // Rental Statistics
  const [rentalStats, setRentalStats] = useState({
    totalRentals: 0,
    activeRentals: 0,
    completedRentals: 0,
    overdueRentals: 0,
    totalRentalRevenue: 0,
    todayReturns: 0,
    todayRevenue: 0,
    fleetUtilization: 0,
    totalFleet: 0
  });

  useEffect(() => {
    if (user && user.role === 'admin') {
      getAllRentals({});
    }
  }, [user?.role]);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await getAllRentals({});
    }
  }));

  // Debounced search for rentals
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setActiveRentalSearch(rentalFilters.searchTerm);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [rentalFilters.searchTerm]);

  // Handle URL parameters to set correct tab
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const rentalTabParam = urlParams.get('rentalTab');
    
    if (rentalTabParam) {
      const rentalTabIndex = parseInt(rentalTabParam, 10);
      if (rentalTabIndex >= 0 && rentalTabIndex <= 4) {
        setRentalTabValue(rentalTabIndex);
      }
    }
  }, [location.search]);

  // Fetch rental statistics
  const fetchRentalStats = async () => {
    try {
      const response = await axiosInstance.get('/api/admin/stats');
      
      if (response.status === 200) {
        const data = response.data;
        if (data.stats) {
          // Calculate today's returns from rentals
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const todayReturns = rentals?.filter(r => {
            if (r.rentalStatus !== 'active') return false;
            const returnDate = new Date(r.returnDate);
            returnDate.setHours(0, 0, 0, 0);
            return returnDate.getTime() === today.getTime();
          }).length || 0;
          
          // Calculate today's revenue
          const todayRevenue = rentals?.filter(r => {
            const createdAt = new Date(r.createdAt);
            createdAt.setHours(0, 0, 0, 0);
            return createdAt.getTime() === today.getTime();
          }).reduce((sum, r) => sum + (r.totalAmount || 0), 0) || 0;
          
          // Calculate fleet utilization
          const totalFleet = data.stats.totalCars || 0;
          const activeRentals = data.stats.activeRentals || 0;
          const fleetUtilization = totalFleet > 0 ? Math.round((activeRentals / totalFleet) * 100) : 0;
          
          setRentalStats({
            totalRentals: data.stats.totalRentals || 0,
            activeRentals: activeRentals,
            completedRentals: data.stats.totalRentals - activeRentals - (data.stats.overdueRentals || 0) || 0,
            overdueRentals: data.stats.overdueRentals || 0,
            totalRentalRevenue: data.stats.totalRevenue || 0,
            todayReturns: todayReturns,
            todayRevenue: todayRevenue,
            fleetUtilization: fleetUtilization,
            totalFleet: totalFleet
          });
        }
      } else {
        console.log('No rental statistics available');
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error loading rental data:', error);
      }
    }
  };

  // Fetch rental stats when component mounts
  useEffect(() => {
    fetchRentalStats();
  }, []);

  // Rental Tab Statistics
  const rentalTabStats = {
    total: rentals?.length || 0,
    active: rentals?.filter(r => r.rentalStatus === 'active').length || 0,
    completed: rentals?.filter(r => r.rentalStatus === 'completed').length || 0,
    overdue: rentals?.filter(r => r.rentalStatus === 'overdue').length || 0,
    cancelled: rentals?.filter(r => r.rentalStatus === 'cancelled').length || 0,
  };

  // Filter rentals based on tab and search
  const filteredRentals = rentals?.filter(rental => {
    const searchTermToUse = activeRentalSearch.toLowerCase();
    const rentalId = (rental.rentalId || formatRentalId(rental._id)).toLowerCase();
    
    // Support searching with or without the RNT- prefix
    const matchesSearch = !searchTermToUse ||
      rentalId.includes(searchTermToUse) ||
      rentalId.replace('rnt-', '').includes(searchTermToUse.replace('rnt-', '')) ||
      rental._id.toLowerCase().includes(searchTermToUse) ||
      `${rental.user?.profile?.firstName} ${rental.user?.profile?.lastName}`.toLowerCase().includes(searchTermToUse) ||
      `${rental.car?.make} ${rental.car?.model}`.toLowerCase().includes(searchTermToUse);

    const matchesTab = (() => {
      switch (rentalTabValue) {
        case 0: return true; // All
        case 1: return rental.rentalStatus === 'active'; // Active
        case 2: return rental.rentalStatus === 'completed'; // Completed
        case 3: return rental.rentalStatus === 'overdue'; // Overdue
        case 4: return rental.rentalStatus === 'cancelled'; // Cancelled
        default: return true;
      }
    })();

    return matchesSearch && matchesTab;
  }) || [];

  // Paginated rentals
  const paginatedRentals = filteredRentals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getRentalStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'overdue': return 'error';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getFilteredRentalsCount = () => {
    return filteredRentals.length || 0;
  };

  const handleRentalFilterChange = (field, value) => {
    setRentalFilters({
      ...rentalFilters,
      [field]: value
    });
  };

  const handleApplyRentalFilters = () => {
    getAllRentals(rentalFilters);
  };

  const handleUpdateRental = (rental) => {
    setSelectedRental(rental);
    setRentalUpdateData({
      rentalStatus: rental.rentalStatus,
      lateFee: rental.lateFee || 0,
      damageFee: rental.damageFee || 0,
      notes: rental.notes || ''
    });
    setRentalUpdateDialog({ open: true, rental });
  };

  const handleViewRentalDetails = (rental) => {
    const totalAmount = rental.calculatedTotal || 
                       ((rental.totalRentalFee || rental.booking?.totalPrice || 0) + 
                        (rental.lateFee || 0) + 
                        (rental.damageFee || 0));
    
    let overdueInfo = '';
    if (rental.rentalStatus === 'overdue' && rental.booking?.endDate) {
      const endDate = new Date(rental.booking.endDate);
      const now = new Date();
      const daysOverdue = Math.ceil((now - endDate) / (1000 * 60 * 60 * 24));
      const dailyRate = rental.car?.pricePerDay || 0;
      const lateFeePerDay = dailyRate * 0.2;
      
      overdueInfo = `
        <div style="background-color: #fff3cd; padding: 8px; border-radius: 4px; margin: 8px 0; border-left: 3px solid #ffc107; font-size: 12px; color: #856404;">
          <div style="color: #856404; margin: 0 0 4px 0; font-weight: bold; font-size: 13px;">⚠️ Overdue: ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</div>
          <div style="margin: 1px 0; color: #856404;"><strong>Rate:</strong> ₱${dailyRate.toLocaleString()}/day → ₱${lateFeePerDay.toFixed(2)}/day late fee</div>
          <div style="margin: 1px 0; color: #856404;"><strong>Expected:</strong> ₱${(lateFeePerDay * daysOverdue).toFixed(2)} total late fee</div>
        </div>
      `;
    }
    
    const rentalIdDisplay = rental.rentalId || formatRentalId(rental._id);
    const details = `
      <div style="font-size: 13px; line-height: 1.3;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">Rental Details - ${rentalIdDisplay}</h3>
        
        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #555;">👤 Customer</h4>
          <div style="margin-left: 8px;">
            <div><strong>Name:</strong> ${rental.user?.profile?.firstName} ${rental.user?.profile?.lastName}</div>
            <div><strong>Email:</strong> ${rental.user?.email}</div>
            <div><strong>Phone:</strong> ${rental.user?.profile?.phone || 'Not provided'}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #555;">🚗 Vehicle</h4>
          <div style="margin-left: 8px;">
            <div><strong>Vehicle:</strong> ${rental.car?.make} ${rental.car?.model} (${rental.car?.year})</div>
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #555;">📅 Rental Period</h4>
          <div style="margin-left: 8px;">
            <div><strong>Booking:</strong> ${rental.booking?.startDate ? new Date(rental.booking.startDate).toLocaleDateString() : 'N/A'} - ${rental.booking?.endDate ? new Date(rental.booking.endDate).toLocaleDateString() : 'N/A'}</div>
            <div><strong>Check-out:</strong> ${new Date(rental.checkOutDate).toLocaleDateString()}</div>
            <div><strong>Check-in:</strong> ${rental.checkInDate ? new Date(rental.checkInDate).toLocaleDateString() : 'Not returned yet'}</div>
            <div><strong>Status:</strong> <span style="color: ${rental.rentalStatus === 'overdue' ? '#dc3545' : rental.rentalStatus === 'completed' ? '#28a745' : '#ffc107'}; font-weight: bold;">${rental.rentalStatus.charAt(0).toUpperCase() + rental.rentalStatus.slice(1)}</span></div>
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #555;">💰 Financial Details</h4>
          <div style="margin-left: 8px;">
            <div><strong>Base Fee:</strong> ₱${(rental.totalRentalFee || rental.booking?.totalPrice || 0).toLocaleString()}</div>
            <div><strong>Late Fee:</strong> ${rental.lateFee > 0 ? `₱${rental.lateFee.toLocaleString()}` : '₱0 (No late fee)'}</div>
            ${rental.damageFee > 0 ? `<div><strong>Damage Fee:</strong> ₱${rental.damageFee.toLocaleString()}</div>` : ''}
            <div style="margin-top: 4px; padding: 4px 0; border-top: 1px solid rgba(255,255,255,0.3);"><strong>Total:</strong> <span style="font-size: 16px; color: #ffffff; font-weight: bold;">₱${totalAmount.toLocaleString()}</span></div>
          </div>
        </div>
        
        ${overdueInfo}
        
        ${rental.notes ? `
        <div style="margin-bottom: 8px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #555;">📝 Notes</h4>
          <div style="margin-left: 8px; font-style: italic;">${rental.notes}</div>
        </div>
        ` : ''}
      </div>
    `;
    
    toast.info(
      <div 
        dangerouslySetInnerHTML={{ __html: details }} 
        style={{ 
          maxHeight: '70vh', 
          overflowY: 'auto', 
          fontSize: '14px',
          lineHeight: '1.4'
        }} 
      />,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        style: { 
          maxWidth: '500px', 
          width: '85vw',
          maxHeight: '80vh'
        }
      }
    );
  };

  const handlePrintRental = (rental) => {
    const printWindow = window.open('', '_blank');
    const totalAmount = rental.calculatedTotal || 
                       ((rental.totalRentalFee || rental.booking?.totalPrice || 0) + 
                        (rental.lateFee || 0) + 
                        (rental.damageFee || 0));
    
    let overdueSection = '';
    if (rental.rentalStatus === 'overdue' && rental.booking?.endDate) {
      const endDate = new Date(rental.booking.endDate);
      const now = new Date();
      const daysOverdue = Math.ceil((now - endDate) / (1000 * 60 * 60 * 24));
      const dailyRate = rental.car?.pricePerDay || 0;
      const lateFeePerDay = dailyRate * 0.2;
      
      overdueSection = `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #ffc107;">
          <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Overdue Information</h4>
          <p><strong>Days Overdue:</strong> ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</p>
          <p><strong>Daily Rate:</strong> ₱${dailyRate.toLocaleString()}</p>
          <p><strong>Late Fee Rate:</strong> ₱${lateFeePerDay.toFixed(2)}/day (20% of daily rate)</p>
          <p><strong>Expected Late Fee:</strong> ₱${(lateFeePerDay * daysOverdue).toFixed(2)}</p>
        </div>
      `;
    }
    
    const rentalIdDisplay = rental.rentalId || formatRentalId(rental._id);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rental Receipt - ${rentalIdDisplay}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h3 { color: #666; margin-top: 20px; }
          p { margin: 5px 0; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          .financial { background: #f5f5f5; padding: 10px; border-radius: 5px; }
          .total { font-size: 1.2em; font-weight: bold; color: #2196F3; }
          hr { border: none; border-top: 1px solid #ddd; margin: 15px 0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Car Rental Receipt</h1>
          <p>Rental ID: ${rentalIdDisplay}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> ${rental.user?.profile?.firstName} ${rental.user?.profile?.lastName}</p>
          <p><strong>Email:</strong> ${rental.user?.email}</p>
          <p><strong>Phone:</strong> ${rental.user?.profile?.phone || 'Not provided'}</p>
        </div>
        
        <div class="section">
          <h3>Vehicle Information</h3>
          <p><strong>Vehicle:</strong> ${rental.car?.make} ${rental.car?.model} (${rental.car?.year})</p>
        </div>
        
        <div class="section">
          <h3>Rental Period</h3>
          <p><strong>Booking Period:</strong> ${rental.booking?.startDate ? new Date(rental.booking.startDate).toLocaleDateString() : 'N/A'} - ${rental.booking?.endDate ? new Date(rental.booking.endDate).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Check-out:</strong> ${new Date(rental.checkOutDate).toLocaleString()}</p>
          <p><strong>Check-in:</strong> ${rental.checkInDate ? new Date(rental.checkInDate).toLocaleString() : 'Not returned yet'}</p>
          <p><strong>Status:</strong> ${rental.rentalStatus.charAt(0).toUpperCase() + rental.rentalStatus.slice(1)}</p>
        </div>
        
        <div class="section financial">
          <h3>Financial Summary</h3>
          <p><strong>Base Rental Fee:</strong> ₱${(rental.totalRentalFee || rental.booking?.totalPrice || 0).toLocaleString()}</p>
          ${rental.lateFee > 0 ? `<p><strong>Late Fee:</strong> ₱${rental.lateFee.toLocaleString()}</p>` : '<p><strong>Late Fee:</strong> ₱0 (No late fee)</p>'}
          ${rental.damageFee > 0 ? `<p><strong>Damage Fee:</strong> ₱${rental.damageFee.toLocaleString()}</p>` : ''}
          <hr/>
          <p class="total">Total Amount: ₱${totalAmount.toLocaleString()}</p>
        </div>
        
        ${overdueSection}
        
        <div style="margin-top: 50px; text-align: center; color: #666;">
          <p>Thank you for choosing our car rental service!</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleRentalMenuClick = (event, rental) => {
    setRentalAnchorEl(event.currentTarget);
    setSelectedRental(rental);
  };

  const handleRentalMenuClose = () => {
    setRentalAnchorEl(null);
  };

  const handleSubmitRentalUpdate = async () => {
    if (rentalUpdateLoading) return;
    
    try {
      setRentalUpdateLoading(true);
      
      const lateFee = rentalUpdateData.lateFee === '' ? 0 : parseFloat(rentalUpdateData.lateFee) || 0;
      const damageFee = rentalUpdateData.damageFee === '' ? 0 : parseFloat(rentalUpdateData.damageFee) || 0;
      
      await updateRentalStatus(
        selectedRental._id,
        rentalUpdateData.rentalStatus,
        lateFee,
        damageFee,
        rentalUpdateData.notes,
        () => {
          if (user && fetchNotifications) {
            const userId = user._id || user.id;
            fetchNotifications(userId, true);
            fetchUnreadCount(userId);
          }
        }
      );
      toast.success('Rental status updated successfully');
      setRentalUpdateDialog({ open: false, rental: null });
      setSelectedRental(null);
      getAllRentals(rentalFilters);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update rental status';
      toast.error(errorMessage);
    } finally {
      setRentalUpdateLoading(false);
    }
  };

  const handleRentalUpdateDataChange = (field, value) => {
    setRentalUpdateData({
      ...rentalUpdateData,
      [field]: value
    });
  };

  const handleExportData = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('type', 'rentals');
      queryParams.append('format', 'pdf');
      
      if (rentalFilters.status) queryParams.append('status', rentalFilters.status);
      if (rentalFilters.userName) queryParams.append('userName', rentalFilters.userName);
      if (rentalFilters.carName) queryParams.append('carName', rentalFilters.carName);
      if (rentalTabValue > 0) {
        const rentalStatusMap = { 1: 'active', 2: 'completed', 3: 'overdue' };
        if (rentalStatusMap[rentalTabValue]) queryParams.append('tabStatus', rentalStatusMap[rentalTabValue]);
      }

      const response = await axiosInstance.get(`/api/admin/export-data?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `rentals_report_${new Date().toISOString().split('T')[0]}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast.success('Rental report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  if (rentalLoading && !rentals) {
    return <PageLoader message="Loading rental data..." />;
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

      {/* Search */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2 }, p: { xs: 1.5, sm: 2 }, borderRadius: { xs: 1, sm: 2 } }}>
        <Box sx={{ maxWidth: { xs: '100%', sm: '500px' } }}>
          <TextField
            fullWidth
            placeholder="Search rentals... (RNT-12345, Customer, Vehicle)"
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
            value={rentalFilters.searchTerm}
            onChange={(e) => {
              const newValue = e.target.value;
              setRentalFilters(prev => ({ ...prev, searchTerm: newValue }));
              if (newValue === '') {
                setActiveRentalSearch('');
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined />
                </InputAdornment>
              ),
              endAdornment: rentalFilters.searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setRentalFilters(prev => ({ ...prev, searchTerm: '' }));
                      setActiveRentalSearch('');
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

      {/* Rental Sub Tabs */}
      <Paper sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
        <Tabs
          value={rentalTabValue}
          onChange={(e, newValue) => setRentalTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '1rem',
            },
          }}
        >
          <Tab label={`All (${rentalTabStats.total})`} />
          <Tab label={`Active (${rentalTabStats.active})`} />
          <Tab label={`Completed (${rentalTabStats.completed})`} />
          <Tab label={`Overdue (${rentalTabStats.overdue})`} />
          <Tab label={`Cancelled (${rentalTabStats.cancelled})`} />
        </Tabs>
      </Paper>

      {/* Rental List/Cards */}
      {paginatedRentals.filter(r => r.car).length === 0 ? (
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
                if (!rentals || rentals.length === 0) {
                  return 'No rentals yet';
                } else if (activeRentalSearch) {
                  return 'No search results';
                } else {
                  const hasDataForTab = rentals?.some(rental => {
                    switch (rentalTabValue) {
                      case 0: return true;
                      case 1: return rental.rentalStatus === 'active';
                      case 2: return rental.rentalStatus === 'completed';
                      case 3: return rental.rentalStatus === 'overdue';
                      case 4: return rental.rentalStatus === 'cancelled';
                      default: return true;
                    }
                  });
                  
                  if (!hasDataForTab) {
                    const tabNames = ['', 'active', 'completed', 'overdue', 'cancelled'];
                    return `No ${tabNames[rentalTabValue]} rentals`;
                  }
                  return 'No rentals found';
                }
              })()}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              {(() => {
                if (!rentals || rentals.length === 0) {
                  return 'Rentals will appear here once bookings are checked out.';
                } else if (activeRentalSearch) {
                  return 'Try adjusting your search criteria to find more results.';
                } else {
                  const hasDataForTab = rentals?.some(rental => {
                    switch (rentalTabValue) {
                      case 0: return true;
                      case 1: return rental.rentalStatus === 'active';
                      case 2: return rental.rentalStatus === 'completed';
                      case 3: return rental.rentalStatus === 'overdue';
                      case 4: return rental.rentalStatus === 'cancelled';
                      default: return true;
                    }
                  });
                  
                  if (!hasDataForTab) {
                    return 'There are no rentals with this status.';
                  }
                  return 'No rentals match the current filters.';
                }
              })()}
            </Typography>
            {activeRentalSearch && rentals && rentals.length > 0 && (
              <Button
                variant="contained"
                onClick={() => {
                  setRentalFilters({ searchTerm: '', searchTrigger: rentalFilters.searchTrigger + 1 });
                  setActiveRentalSearch('');
                  setRentalTabValue(0);
                }}
                startIcon={<RefreshOutlined />}
              >
                Clear All Filters
              </Button>
            )}
          </Paper>
        ) : isMobile || isTablet ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paginatedRentals.filter(r => r.car).map((rental) => (
              <Card key={rental._id} sx={{ p: 0, '&:hover': { boxShadow: theme.shadows[4] } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Rental ID
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {rental.rentalId || formatRentalId(rental._id)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={rental.rentalStatus.charAt(0).toUpperCase() + rental.rentalStatus.slice(1)}
                        color={getRentalStatusColor(rental.rentalStatus)}
                        size="small"
                        variant="filled"
                      />
                      <IconButton
                        onClick={(e) => handleRentalMenuClick(e, rental)}
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
                        Vehicle
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <DirectionsCarOutlined sx={{ color: 'primary.main', fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {rental.car.make} {rental.car.model} ({rental.car.year})
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Customer
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {rental.user?.profile?.firstName} {rental.user?.profile?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rental.user?.email}
                        </Typography>
                        {(rental.booking?.location || rental.booking?.pickupLocation) && (
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
                              if (rental.booking?.latitude && rental.booking?.longitude) {
                                // Use precise coordinates for accurate location with marker
                                window.open(
                                  `https://www.google.com/maps?q=${rental.booking.latitude},${rental.booking.longitude}`,
                                  '_blank'
                                );
                              } else {
                                // Fallback to address search if coordinates not available
                                const location = rental.booking?.location || rental.booking?.pickupLocation;
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
                            {rental.booking?.location || rental.booking?.pickupLocation}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Rental Period
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {rental.booking?.startDate ? new Date(rental.booking.startDate).toLocaleDateString() : 'N/A'} - {rental.booking?.endDate ? new Date(rental.booking.endDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Check-out: {new Date(rental.checkOutDate).toLocaleDateString()}
                      </Typography>
                      {rental.checkInDate && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Check-in: {new Date(rental.checkInDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Fees
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="primary.main">
                        ₱{(rental.totalRentalFee || rental.booking?.totalPrice || 0).toLocaleString()}
                      </Typography>
                      {rental.lateFee > 0 && (
                        <Typography variant="caption" color="error.main" display="block">
                          Late: ₱{rental.lateFee.toLocaleString()}
                        </Typography>
                      )}
                      {rental.damageFee > 0 && (
                        <Typography variant="caption" color="error.main" display="block">
                          Damage: ₱{rental.damageFee.toLocaleString()}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Notes
                      </Typography>
                      {rental.notes ? (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {rental.notes}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                          No notes
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Rental Period</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Fees</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRentals.filter(r => r.car).map((rental) => (
                  <TableRow key={rental._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <DirectionsCarOutlined sx={{ color: 'primary.main' }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {rental.car.make} {rental.car.model} ({rental.car.year})
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {rental.rentalId || formatRentalId(rental._id)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {rental.user?.profile?.firstName} {rental.user?.profile?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {rental.user?.email}
                        </Typography>
                        {(rental.booking?.location || rental.booking?.pickupLocation) && (
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
                              if (rental.booking?.latitude && rental.booking?.longitude) {
                                // Use precise coordinates for accurate location with marker
                                window.open(
                                  `https://www.google.com/maps?q=${rental.booking.latitude},${rental.booking.longitude}`,
                                  '_blank'
                                );
                              } else {
                                // Fallback to address search if coordinates not available
                                const location = rental.booking?.location || rental.booking?.pickupLocation;
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
                            {rental.booking?.location || rental.booking?.pickupLocation}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {rental.booking?.startDate ? new Date(rental.booking.startDate).toLocaleDateString() : 'N/A'} - {rental.booking?.endDate ? new Date(rental.booking.endDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Check-out: {new Date(rental.checkOutDate).toLocaleDateString()}
                        </Typography>
                        {rental.checkInDate && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Check-in: {new Date(rental.checkInDate).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={rental.rentalStatus.charAt(0).toUpperCase() + rental.rentalStatus.slice(1)}
                        color={getRentalStatusColor(rental.rentalStatus)}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          ₱{(rental.totalRentalFee || rental.booking?.totalPrice || 0).toLocaleString()}
                        </Typography>
                        {rental.lateFee > 0 && (
                          <Typography variant="caption" color="error.main">
                            Late: ₱{rental.lateFee.toLocaleString()}
                          </Typography>
                        )}
                        {rental.damageFee > 0 && (
                          <Typography variant="caption" color="error.main" display="block">
                            Damage: ₱{rental.damageFee.toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      {rental.notes ? (
                        <Tooltip title={rental.notes} arrow placement="top">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
                            <NotesOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" sx={{ 
                              maxWidth: 100, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {rental.notes}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          No notes
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleRentalMenuClick(e, rental)}
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
        count={filteredRentals.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Rentals per page:"
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

      {/* Rental Update Dialog */}
      <Dialog open={rentalUpdateDialog.open} onClose={() => setRentalUpdateDialog({ open: false, rental: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Update Rental Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Update the rental status for {rentalUpdateDialog.rental?.car?.make} {rentalUpdateDialog.rental?.car?.model}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Rental Status</InputLabel>
                <Select
                  value={rentalUpdateData.rentalStatus}
                  label="Rental Status"
                  onChange={(e) => handleRentalUpdateDataChange('rentalStatus', e.target.value)}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Late Fee"
                type="number"
                value={rentalUpdateData.lateFee}
                onChange={(e) => {
                  const value = e.target.value;
                  handleRentalUpdateDataChange('lateFee', value === '' ? '' : parseFloat(value) || 0);
                }}
                inputProps={{ min: 0 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₱</Typography>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Damage Fee"
                type="number"
                value={rentalUpdateData.damageFee}
                onChange={(e) => {
                  const value = e.target.value;
                  handleRentalUpdateDataChange('damageFee', value === '' ? '' : parseFloat(value) || 0);
                }}
                inputProps={{ min: 0 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₱</Typography>,
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={rentalUpdateData.notes}
                onChange={(e) => handleRentalUpdateDataChange('notes', e.target.value)}
                placeholder="Add any notes about the rental status update..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRentalUpdateDialog({ open: false, rental: null })}
            disabled={rentalUpdateLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitRentalUpdate} 
            variant="contained"
            disabled={rentalUpdateLoading}
            startIcon={rentalUpdateLoading ? <CircularProgress size={20} /> : null}
          >
            {rentalUpdateLoading ? 'Updating...' : 'Update Rental'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rental Action Menu */}
      <Menu
        anchorEl={rentalAnchorEl}
        open={Boolean(rentalAnchorEl)}
        onClose={handleRentalMenuClose}
      >
        {selectedRental && (
          <>
            <MenuItem onClick={() => {
              handleViewRentalDetails(selectedRental);
              handleRentalMenuClose();
            }}>
              <VisibilityOutlined sx={{ mr: 1, fontSize: 18 }} />
              View Details
            </MenuItem>
            
            {(selectedRental.rentalStatus !== 'completed' && selectedRental.rentalStatus !== 'cancelled') && (
              <MenuItem onClick={() => {
                handleUpdateRental(selectedRental);
                handleRentalMenuClose();
              }} sx={{ color: 'primary.main' }}>
                <EditOutlined sx={{ mr: 1, fontSize: 18 }} />
                Update Status
              </MenuItem>
            )}
            
            <MenuItem onClick={() => {
              handlePrintRental(selectedRental);
              handleRentalMenuClose();
            }}>
              <PrintOutlined sx={{ mr: 1, fontSize: 18 }} />
              Print Receipt
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
});

export default RentalManager;
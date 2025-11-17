import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Typography,
  useTheme,
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  BookOnlineOutlined,
  DirectionsCarOutlined,
  RefreshOutlined,
  DownloadOutlined,
} from '@mui/icons-material';
import BookingManager from './BookingManager';
import RentalManager from './RentalManager';
import { useToast } from '../../components/feedback/ToastProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import axiosInstance from '../../utils/axiosConfig';

const ModernBookingRentalManager = () => {
  const theme = useTheme();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const bookingManagerRef = useRef();
  const rentalManagerRef = useRef();

  // Set initial tab based on URL parameter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam) {
      const tabIndex = parseInt(tabParam, 10);
      if (tabIndex >= 0 && tabIndex <= 1) {
        setTabValue(tabIndex);
      }
    }
  }, [location.search]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Update URL with tab parameter
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('tab', newValue.toString());
    navigate(`${location.pathname}?${urlParams.toString()}`, { replace: true });
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      if (tabValue === 0 && bookingManagerRef.current?.refresh) {
        await bookingManagerRef.current.refresh();
      } else if (tabValue === 1 && rentalManagerRef.current?.refresh) {
        await rentalManagerRef.current.refresh();
      }
      toast?.success('Data refreshed successfully');
    } catch (error) {
      toast?.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportData = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('type', tabValue === 0 ? 'bookings' : 'rentals');
      queryParams.append('format', 'pdf');

      const response = await axiosInstance.get(`/api/admin/export-data?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `${tabValue === 0 ? 'bookings' : 'rentals'}_report_${new Date().toISOString().split('T')[0]}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast?.success(`${tabValue === 0 ? 'Booking' : 'Rental'} report exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast?.error('Failed to export data');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3, md: 4 }, mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ 
        mb: { xs: 2, sm: 2.5, md: 3 }, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
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
            {tabValue === 0 ? (
              <BookOnlineOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
            ) : (
              <DirectionsCarOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
            )}
            {tabValue === 0 ? 'Booking Management' : 'Rental Management'}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: { xs: 2, sm: 2.5, md: 3 },
              lineHeight: 1.6,
            }}
          >
            {tabValue === 0 
              ? 'Manage customer bookings, approvals, and cancellations' 
              : 'Manage active rentals, returns, and rental history'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Tooltip title={refreshing ? "Refreshing..." : "Refresh Data"}>
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
          
          <Button
            startIcon={<DownloadOutlined sx={{ fontSize: { xs: 18, sm: 20 } }} />}
            onClick={handleExportData}
            variant="outlined"
            size="small"
            sx={{ 
              textTransform: 'none',
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              px: { xs: 1.5, sm: 2 },
              whiteSpace: 'nowrap'
            }}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 2, 
          mb: { xs: 2, sm: 3 }, 
          boxShadow: theme => theme.shadows[2],
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.8125rem', sm: '0.9375rem', md: '1.1rem' },
              minHeight: { xs: 48, sm: 56 },
              py: { xs: 1, sm: 1.5 },
            },
            '& .MuiSvgIcon-root': {
              fontSize: { xs: 18, sm: 20, md: 24 },
            },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab
            label="Bookings"
            icon={<BookOnlineOutlined />}
            iconPosition="start"
          />
          <Tab
            label="Rentals"
            icon={<DirectionsCarOutlined />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mt: 2 }}>
        {tabValue === 0 ? (
          <BookingManager ref={bookingManagerRef} />
        ) : (
          <RentalManager ref={rentalManagerRef} />
        )}
      </Box>
    </Container>
  );
};

export default ModernBookingRentalManager;

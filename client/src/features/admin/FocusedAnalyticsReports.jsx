import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
  alpha,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Skeleton,
  Tooltip,
  CircularProgress,
} from '@mui/material';

import {
  TrendingUpOutlined,
  TrendingDownOutlined,
  AttachMoneyOutlined,
  PaymentOutlined,
  DirectionsCarOutlined,
  PeopleOutlined,
  AssessmentOutlined,
  DownloadOutlined,
  CalendarTodayOutlined,
  ShowChartOutlined,
  PieChartOutlined,
  BarChartOutlined,
  RefreshOutlined,
  FilterListOutlined,
  PersonAddOutlined,
  RepeatOutlined,
} from '@mui/icons-material';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { useAdminData } from '../../contexts/AdminDataContext';
import { useAuth } from '../auth/AuthContext';
import { getImageUrl } from '../../utils/imageHelper';
import { useToast } from '../../components/feedback/ToastProvider';
import StatsCard from '../../components/dashboard/StatsCard';
import { PageLoader } from '../../components/feedback/LoadingSpinner';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format currency to Philippine Peso
const formatCurrency = (amount) => {
  // Ensure we always show peso sign, not dollar
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `₱${formatted}`;
};

const FocusedAnalyticsReports = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const toast = useToast();
  const { user } = useAuth();
  
  // Use shared admin data
  const { 
    adminStats, 
    bookings, 
    rentals, 
    cars, 
    users,
    computedStats,
    loading,
    refreshData 
  } = useAdminData();
  
  const [dateRange, setDateRange] = useState('30'); // days
  const [reportType, setReportType] = useState('revenue');
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    revenue: {
      total: 0,
      breakdown: [],
      trend: [],
      growth: 0,
    },
    bookings: {
      total: 0,
      byStatus: {},
      trend: [],
      averageValue: 0,
    },
    fleet: {
      utilization: 0,
      topPerformers: [],
      maintenanceNeeded: 0,
      revenue: [],
    },
    customers: {
      total: 0,
      new: 0,
      returning: 0,
      topSpenders: [],
    },
  });
  
  // Process analytics data based on date range
  useEffect(() => {
    if (!bookings || !rentals || !cars || !users) return;
    
    const now = new Date();
    const startDate = subDays(now, parseInt(dateRange));
    
    const filteredBookings = bookings.filter(b => 
      new Date(b.createdAt) >= startDate
    );
    
    const filteredRentals = rentals.filter(r => 
      new Date(r.createdAt) >= startDate
    );
    
    // Calculate revenue analytics - ONLY from completed rentals
    const completedRentals = filteredRentals.filter(r => 
      r.rentalStatus === 'completed'
    );
    
    const rentalRevenue = completedRentals.reduce((sum, r) => 
      sum + (r.totalRentalFee || 0), 0
    );
    const lateFees = completedRentals.reduce((sum, r) => 
      sum + (r.lateFee || 0), 0
    );
    const damageFees = completedRentals.reduce((sum, r) => 
      sum + (r.damageFee || 0), 0
    );
    const totalRevenue = rentalRevenue + lateFees + damageFees;
    
    // Generate monthly revenue trend (last 6 months) - ONLY completed rentals
    const monthlyRevenue = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = now.getMonth();
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthRentals = rentals.filter(r => {
        const rentalDate = new Date(r.createdAt);
        return rentalDate.getMonth() === monthIndex && r.rentalStatus === 'completed';
      });
      
      const monthRevenue = monthRentals.reduce((sum, r) => 
        sum + (r.totalRentalFee || 0) + (r.lateFee || 0) + (r.damageFee || 0), 0
      );
      
      monthlyRevenue.push({
        month: months[monthIndex],
        revenue: monthRevenue
      });
    }
    
    // Use monthly revenue as trend
    const revenueTrend = monthlyRevenue.map(item => ({
      date: item.month,
      revenue: item.revenue
    }));
    
    // Calculate growth - ONLY completed rentals
    const previousPeriodStart = subDays(startDate, parseInt(dateRange));
    const previousRentals = rentals.filter(r => {
      const rentalDate = new Date(r.createdAt);
      return rentalDate >= previousPeriodStart && rentalDate < startDate;
    });
    
    const previousCompletedRentals = previousRentals.filter(r => 
      r.rentalStatus === 'completed'
    );
    
    const previousRevenue = previousCompletedRentals.reduce((sum, r) => 
      sum + (r.totalRentalFee || 0) + (r.lateFee || 0) + (r.damageFee || 0), 0
    );
    
    const revenueGrowth = previousRevenue > 0 
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
      : totalRevenue > 0 ? 100 : 0; // If no previous revenue but current revenue exists, show 100% growth
    

    // Calculate revenue breakdown (like ModernAnalyticsReports)
    const revenueBreakdown = [
      { name: 'Rental Fees', value: rentalRevenue, color: theme.palette.primary.main },
      { name: 'Late Fees', value: lateFees, color: theme.palette.warning.main },
      { name: 'Damage Fees', value: damageFees, color: theme.palette.error.main },
    ].filter(item => item.value > 0);
    
    // Use real data only (no mock data)
    const finalRevenueBreakdown = revenueBreakdown;
    
    // Calculate booking analytics
    const bookingsByStatus = filteredBookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});
    
    // Average booking value - use COMPLETED rentals only for accurate average
    const averageBookingValue = completedRentals.length > 0
      ? Math.round(completedRentals.reduce((sum, r) => 
          sum + (r.totalRentalFee || 0) + (r.lateFee || 0) + (r.damageFee || 0), 0
        ) / completedRentals.length)
      : 0;
    
    // Calculate fleet analytics
    const carPerformance = {};
    cars.forEach(car => {
      carPerformance[car._id] = {
        car,
        rentals: 0,
        revenue: 0,
        daysRented: 0, // Track total days rented for accurate utilization
        utilization: 0,
      };
    });
    
    // Process ONLY completed rentals for revenue (actual earned revenue)
    filteredRentals.forEach(rental => {
      if (!rental.car) return;
      
      const carId = typeof rental.car === 'object' && rental.car !== null ? rental.car._id : rental.car;
      
      if (!carId) return;
      
      if (carPerformance[carId]) {
        // Only count completed rentals for revenue
        if (rental.rentalStatus === 'completed') {
          carPerformance[carId].rentals++;
          // Add all fees: rental fee + late fees + damage fees
          carPerformance[carId].revenue += (rental.totalRentalFee || 0) + (rental.lateFee || 0) + (rental.damageFee || 0);
          
          // Calculate rental duration in days for utilization
          if (rental.booking?.startDate && rental.booking?.endDate) {
            const startDate = new Date(rental.booking.startDate);
            const endDate = new Date(rental.booking.endDate);
            const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            carPerformance[carId].daysRented += rentalDays > 0 ? rentalDays : 0;
          }
        }
      }
    });
    
    // Calculate utilization for each car based on actual days rented
    const daysInPeriod = parseInt(dateRange);
    Object.values(carPerformance).forEach(perf => {
      // Utilization = (Total Days Rented / Days in Period) × 100
      // Cap at 100% in case of overlapping rentals or data issues
      perf.utilization = daysInPeriod > 0 
        ? Math.min(100, Math.round((perf.daysRented / daysInPeriod) * 100))
        : 0;
    });
    
    const topPerformers = Object.values(carPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Calculate available cars (not currently rented)
    const activeRentalCarIds = rentals
      .filter(r => r.rentalStatus === 'active')
      .map(r => r.car?._id || r.car)
      .filter(Boolean);
    
    const availableCars = cars.filter(car => 
      car.availability === 'available' && 
      !activeRentalCarIds.includes(car._id)
    ).length;
    
    // Calculate customer analytics (excluding admin users)
    // Use COMPLETED rentals only for accurate spending data
    const userRoleMap = {};
    users.forEach(user => {
      userRoleMap[user._id] = user;
    });
    
    const customerData = {};
    
    // Process completed rentals for customer spending
    filteredRentals.forEach(rental => {
      if (!rental.user) return;
      
      // Get user ID (handle both object and string)
      const userId = typeof rental.user === 'object' && rental.user !== null 
        ? rental.user._id 
        : rental.user;
      
      if (!userId) return;
      
      // Get the full user data to check role
      const fullUser = userRoleMap[userId];
      
      // Check if this user is an admin
      const isAdminUser = fullUser && (
        fullUser.role === 'admin' || 
        fullUser.role === 'Admin' ||
        fullUser.role === 'ADMIN' ||
        fullUser.isAdmin === true ||
        fullUser.userType === 'admin'
      );
      
      // Only include non-admin users in customer analytics
      // Only count completed rentals for actual spending
      if (!isAdminUser && rental.rentalStatus === 'completed') {
        if (!customerData[userId]) {
          customerData[userId] = {
            user: rental.user,
            bookings: 0,
            totalSpent: 0,
          };
        }
        customerData[userId].bookings++;
        // Total spent = rental fee + late fees + damage fees
        customerData[userId].totalSpent += (rental.totalRentalFee || 0) + (rental.lateFee || 0) + (rental.damageFee || 0);
      }
    });
    
    const topSpenders = Object.values(customerData)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
    
    // New customers (created within date range, excluding admins)
    const newCustomers = users.filter(u => {
      const createdDate = new Date(u.createdAt);
      const isAdmin = (u.role === 'admin') || 
                      (u.isAdmin === true) || 
                      (u.profile && (u.profile.role === 'admin' || u.profile.isAdmin === true));
      return !isAdmin && createdDate >= startDate && createdDate <= now;
    }).length;
    
    setAnalyticsData({
      revenue: {
        total: totalRevenue,
        breakdown: finalRevenueBreakdown,
        trend: revenueTrend,
        growth: revenueGrowth,
      },
      bookings: {
        total: filteredBookings.length,
        byStatus: bookingsByStatus,
        // Real booking trend - count bookings per month (last 6 months)
        trend: monthlyRevenue.map(item => {
          const monthBookings = bookings.filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate.getMonth() === months.indexOf(item.month);
          });
          return { date: item.month, bookings: monthBookings.length };
        }),
        averageValue: averageBookingValue,
      },
      fleet: {
        // Overall fleet utilization = (Total Days Rented Across All Cars / (Number of Cars × Days in Period)) × 100
        utilization: (cars.length > 0 && daysInPeriod > 0) 
          ? Math.min(100, Math.round((Object.values(carPerformance).reduce((sum, p) => sum + p.daysRented, 0) / (cars.length * daysInPeriod)) * 100))
          : 0,
        topPerformers,
        maintenanceNeeded: cars.filter(c => c.availability === 'maintenance').length,
        available: availableCars,
        revenue: topPerformers.map(p => ({
          car: `${p.car.make} ${p.car.model}`,
          revenue: p.revenue,
        })),
      },
      customers: {
        total: users.filter(u => {
          const isAdmin = (u.role === 'admin') || 
                          (u.isAdmin === true) || 
                          (u.profile && (u.profile.role === 'admin' || u.profile.isAdmin === true));
          return !isAdmin;
        }).length,
        new: newCustomers,
        returning: Object.keys(customerData).length,
        topSpenders,
      },
    });
  }, [bookings, rentals, cars, users, dateRange, theme]);
  
  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await refreshData();
      toast?.success('Data refreshed successfully');
    } catch (error) {
      toast?.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleExportReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(20);
    doc.text('Analytics Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    doc.text(`Period: Last ${dateRange} days`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, 37, { align: 'center' });
    
    // Revenue Section
    doc.setFontSize(16);
    doc.text('Revenue Analytics', 14, 50);
    doc.setFontSize(12);
    doc.text(`Total Revenue: PHP ${analyticsData.revenue.total.toLocaleString()}`, 14, 60);
    doc.text(`Growth: ${analyticsData.revenue.growth}%`, 14, 67);
    
    // Revenue Breakdown Table
    const revenueData = analyticsData.revenue.breakdown.map(item => [
      item.name,
      `PHP ${item.value.toLocaleString()}`,
      `${Math.round((item.value / analyticsData.revenue.total) * 100)}%`
    ]);
    
    autoTable(doc, {
      head: [['Category', 'Amount', 'Percentage']],
      body: revenueData,
      startY: 75,
      theme: 'grid',
    });
    
    // Fleet Performance
    const fleetY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Fleet Performance', 14, fleetY);
    
    const fleetData = analyticsData.fleet.topPerformers.map(perf => [
      `${perf.car.make} ${perf.car.model}`,
      perf.car.registrationNumber,
      perf.rentals,
      `PHP ${perf.revenue.toLocaleString()}`,
      `${perf.utilization}%`
    ]);
    
    autoTable(doc, {
      head: [['Vehicle', 'Reg. Number', 'Rentals', 'Revenue', 'Utilization']],
      body: fleetData,
      startY: fleetY + 10,
      theme: 'grid',
    });
    
    // Customer Analytics
    const customerY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Customer Analytics', 14, customerY);
    doc.setFontSize(12);
    doc.text(`Total Customers: ${analyticsData.customers.total}`, 14, customerY + 10);
    doc.text(`New Customers: ${analyticsData.customers.new}`, 14, customerY + 17);
    doc.text(`Returning Customers: ${analyticsData.customers.returning}`, 14, customerY + 24);
    
    // Save the PDF
    doc.save(`analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast?.success('Report exported successfully');
  };
  
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.success.main,
  ];
  
  // Only show loading on initial load, not during refresh
  if (loading && !refreshing && !adminStats) {
    return <PageLoader />;
  }
  
  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        py: { xs: 2, sm: 3, md: 4 }, 
        px: { xs: 1, sm: 3 },
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          mb: { xs: 2, sm: 2.5, md: 3 } 
        }}>
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700,
                color: 'text.primary',
                mb: { xs: 1.5, sm: 2 },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5, md: 2 },
              }}
            >
              <AssessmentOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
              Analytics & Reports
            </Typography>
            <Typography 
              variant="h6" 
              sx={{
                color: 'text.secondary',
                mb: { xs: 2, sm: 2.5, md: 3 },
                lineHeight: 1.6,
              }}
            >
              Historical data analysis and business intelligence
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
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
              variant="outlined"
              startIcon={<DownloadOutlined sx={{ fontSize: { xs: 18, sm: 20 } }} />}
              onClick={handleExportReport}
              size="small"
              sx={{ 
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                px: { xs: 1.5, sm: 2 },
                whiteSpace: 'nowrap'
              }}
            >
              Export Report
            </Button>
          </Box>
        </Box>
        
        {/* Filters */}
        <Paper 
          sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            display: 'flex', 
            gap: { xs: 1.5, sm: 2 }, 
            alignItems: 'center',
            flexWrap: 'wrap',
            borderRadius: { xs: 1, sm: 2 },
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
          }}
        >
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              label="Date Range"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              <MenuItem value="7">Last 7 Days</MenuItem>
              <MenuItem value="30">Last 30 Days</MenuItem>
              <MenuItem value="90">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              label="Report Type"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              <MenuItem value="revenue">Revenue</MenuItem>
              <MenuItem value="fleet">Fleet</MenuItem>
              <MenuItem value="customers">Customers</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Box>
      
      {/* Revenue Analytics */}
      {reportType === 'revenue' && (
        <>
          {/* Revenue Trend and Breakdown in One Row */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', lg: 'row' }, 
            gap: 3, 
            mb: 4 
          }}>
            {/* Revenue Trend - Left Column */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper sx={{ p: 3, height: 450, borderRadius: 2, width: '100%', position: 'relative' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShowChartOutlined sx={{ color: 'primary.main' }} />
                  Revenue Trend
                </Typography>
                <Box sx={{ width: '100%', height: 'calc(100% - 50px)' }}>
                  {analyticsData.revenue.trend && analyticsData.revenue.trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.revenue.trend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: theme.shape.borderRadius,
                          boxShadow: theme.shadows[4]
                        }}
                        formatter={(value) => formatCurrency(value)}
                        labelStyle={{ color: theme.palette.text.primary }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={theme.palette.primary.main} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography color="text.secondary">No revenue data available for the selected period</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>

            {/* Revenue Breakdown - Right Column */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper sx={{ p: 3, height: 450, borderRadius: 2, width: '100%', position: 'relative' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PieChartOutlined sx={{ color: 'primary.main' }} />
                  Revenue Breakdown
                </Typography>
                <Box sx={{ width: '100%', height: 'calc(100% - 50px)' }}>
                  {analyticsData.revenue.breakdown && analyticsData.revenue.breakdown.length > 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center', 
                    justifyContent: { xs: 'center', sm: 'space-between' }, 
                    height: '100%',
                    gap: { xs: 2, sm: 0 }
                  }}>
                    <ResponsiveContainer 
                      width={isMobile ? "100%" : "70%"} 
                      height={isMobile ? "60%" : "100%"}
                    >
                      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <Pie
                          data={analyticsData.revenue.breakdown || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          innerRadius={isMobile ? 50 : 80}
                          outerRadius={isMobile ? 100 : 150}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(analyticsData.revenue.breakdown || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                        <text 
                          x="50%" 
                          y="50%" 
                          textAnchor="middle" 
                          dominantBaseline="middle"
                          style={{ fontSize: '14px', fill: theme.palette.text.secondary }}
                        >
                          <tspan 
                            x="50%" 
                            dy="-0.5em"
                            style={{ fontSize: '24px', fontWeight: 'bold', fill: theme.palette.text.primary }}
                          >
                            {formatCurrency(analyticsData.revenue.total)}
                          </tspan>
                          <tspan 
                            x="50%" 
                            dy="1.5em"
                            style={{ fontSize: '14px', fill: theme.palette.text.secondary }}
                          >
                            Total Revenue
                          </tspan>
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ 
                      width: { xs: '100%', sm: '30%' }, 
                      pl: { xs: 0, sm: 2 },
                      pt: { xs: 2, sm: 0 }
                    }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, textAlign: { xs: 'center', sm: 'left' } }}>Breakdown</Typography>
                      {analyticsData.revenue.breakdown.map((entry, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: entry.color,
                              mr: 1.5,
                              flexShrink: 0
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {entry.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(entry.value)} ({((entry.value / analyticsData.revenue.total) * 100).toFixed(1)}%)
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography color="text.secondary">No breakdown data available</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          </Box>
          
          {/* Revenue Stats Cards */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)'
            },
            gap: { xs: 1.5, sm: 2 },
            mb: { xs: 2, sm: 3, md: 4 }
          }}>
            <StatsCard
              title="Total Revenue"
              value={formatCurrency(analyticsData.revenue.total)}
              icon={<PaymentOutlined />}
              color="success"
              trend={analyticsData.revenue.growth > 0 ? 'up' : analyticsData.revenue.growth < 0 ? 'down' : 'neutral'}
              trendValue={`${analyticsData.revenue.growth > 0 ? '+' : ''}${analyticsData.revenue.growth}%`}
            />
            <StatsCard
              title="Daily Average"
              value={formatCurrency(analyticsData.revenue.total / parseInt(dateRange))}
              icon={<ShowChartOutlined />}
              color="primary"
              subtitle={`Last ${dateRange} days`}
            />
            <StatsCard
              title="Rental Fees"
              value={formatCurrency(analyticsData.revenue.breakdown[0]?.value || 0)}
              icon={<PieChartOutlined />}
              color="warning"
              subtitle="Primary revenue"
            />
            <StatsCard
              title="Avg Per Booking"
              value={formatCurrency(analyticsData.revenue.total / (analyticsData.bookings.total || 1))}
              icon={<BarChartOutlined />}
              color="info"
              subtitle="Per booking"
            />
          </Box>
        </>
      )}
      
      {/* Fleet Analytics */}
      {reportType === 'fleet' && (
        <>
          {/* First Row: Top Performing Vehicles */}
          <Box sx={{ mb: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 2, width: '100%', position: 'relative' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DirectionsCarOutlined sx={{ color: 'primary.main' }} />
                Top Performing Vehicles
              </Typography>
              {isMobile || isTablet ? (
                <Stack spacing={2}>
                  {analyticsData.fleet.topPerformers.map((perf, index) => (
                    <Card key={index}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                              <DirectionsCarOutlined color="primary" />
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {perf.car.make} {perf.car.model}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {perf.car.year}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip 
                            label={`${perf.utilization}%`}
                            size="small"
                            color={perf.utilization >= 50 ? 'success' : perf.utilization >= 20 ? 'warning' : 'error'}
                          />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Registration
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {perf.car.registrationNumber}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Rentals
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip label={perf.rentals} size="small" color="primary" />
                            </Box>
                          </Grid>

                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Revenue
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="success.main">
                              {formatCurrency(perf.revenue)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <TableContainer sx={{ width: '100%' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Vehicle</TableCell>
                        <TableCell>Registration</TableCell>
                        <TableCell align="center">Rentals</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="center">Utilization</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.fleet.topPerformers.map((perf, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                <DirectionsCarOutlined color="primary" />
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {perf.car.make} {perf.car.model}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {perf.car.year}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{perf.car.registrationNumber}</TableCell>
                          <TableCell align="center">
                            <Chip label={perf.rentals} size="small" color="primary" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="medium">
                              {formatCurrency(perf.revenue)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${perf.utilization}%`}
                              size="small"
                              color={perf.utilization >= 50 ? 'success' : perf.utilization >= 20 ? 'warning' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
          
          {/* Second Row: Fleet Statistics Cards */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)'
            },
            gap: { xs: 1.5, sm: 2 },
            mb: { xs: 2, sm: 3, md: 4 }
          }}>
            <StatsCard
              title="Overall Utilization"
              value={`${analyticsData.fleet.utilization}%`}
              icon={<ShowChartOutlined />}
              color="primary"
              trend={analyticsData.fleet.utilization > 70 ? 'up' : analyticsData.fleet.utilization > 40 ? 'neutral' : 'down'}
              subtitle="Fleet efficiency"
            />
            <StatsCard
              title="Total Fleet Size"
              value={cars?.length || 0}
              icon={<DirectionsCarOutlined />}
              color="info"
              subtitle="Available vehicles"
            />
            <StatsCard
              title="Maintenance Required"
              value={analyticsData.fleet.maintenanceNeeded}
              icon={<BarChartOutlined />}
              color="warning"
              subtitle="Needs attention"
            />
            <StatsCard
              title="Available Cars"
              value={analyticsData.fleet.available}
              icon={<DirectionsCarOutlined />}
              color="success"
              subtitle="Ready to rent"
            />
          </Box>
        </>
      )}
      
      {/* Customer Analytics */}
      {reportType === 'customers' && (
        <>
          {/* First Row: Top Customers Table */}
          <Box sx={{ mb: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 2, width: '100%', position: 'relative' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleOutlined sx={{ color: 'primary.main' }} />
                Top Customers
              </Typography>
              {isMobile || isTablet ? (
                <Stack spacing={2}>
                  {analyticsData.customers.topSpenders.map((customer, index) => (
                    <Card key={index}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Avatar 
                            src={getImageUrl(customer.user.profile?.profilePicture)}
                            sx={{ 
                              bgcolor: customer.user.profile?.profilePicture 
                                ? 'transparent' 
                                : (theme) => theme.palette.primary.main + 'E6',
                              border: (theme) => `2px solid ${theme.palette.primary.main}33`,
                              fontSize: '0.875rem',
                              fontWeight: 700,
                              color: 'white',
                              boxShadow: theme.shadows[2],
                              flexShrink: 0
                            }}
                          >
                            {!customer.user.profile?.profilePicture && (
                              customer.user.profile?.firstName && customer.user.profile?.lastName
                                ? `${customer.user.profile.firstName.charAt(0)}${customer.user.profile.lastName.charAt(0)}`.toUpperCase()
                                : customer.user.name?.charAt(0).toUpperCase() || 'U'
                            )}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {customer.user.profile?.firstName && customer.user.profile?.lastName
                                ? `${customer.user.profile.firstName} ${customer.user.profile.lastName}`
                                : customer.user.name || 'Unknown User'}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              title={customer.user.email}
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block'
                              }}
                            >
                              {customer.user.email}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              Bookings
                            </Typography>
                            <Typography variant="body1" fontWeight={600} color="primary.main">
                              {customer.bookings}
                            </Typography>
                          </Grid>

                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              Total Spent
                            </Typography>
                            <Typography variant="body1" fontWeight={600} color="success.main">
                              {formatCurrency(customer.totalSpent)}
                            </Typography>
                          </Grid>

                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              Avg Booking
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formatCurrency(customer.totalSpent / customer.bookings)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <TableContainer sx={{ width: '100%' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell align="center">Bookings</TableCell>
                        <TableCell align="right">Total Spent</TableCell>
                        <TableCell align="right">Average Booking</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.customers.topSpenders.map((customer, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar 
                                src={getImageUrl(customer.user.profile?.profilePicture)}
                                sx={{ 
                                  bgcolor: customer.user.profile?.profilePicture 
                                    ? 'transparent' 
                                    : (theme) => theme.palette.primary.main + 'E6', // 90% opacity
                                  border: (theme) => `2px solid ${theme.palette.primary.main}33`, // 20% opacity border
                                  fontSize: '0.875rem',
                                  fontWeight: 700,
                                  color: 'white',
                                  boxShadow: theme.shadows[2],
                                }}
                              >
                                {!customer.user.profile?.profilePicture && (
                                  customer.user.profile?.firstName && customer.user.profile?.lastName
                                    ? `${customer.user.profile.firstName.charAt(0)}${customer.user.profile.lastName.charAt(0)}`.toUpperCase()
                                    : customer.user.name?.charAt(0).toUpperCase() || 'U'
                                )}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {customer.user.profile?.firstName && customer.user.profile?.lastName
                                    ? `${customer.user.profile.firstName} ${customer.user.profile.lastName}`
                                    : customer.user.name || 'Unknown User'}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  title={customer.user.email}
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '200px',
                                    display: 'block'
                                  }}
                                >
                                  {customer.user.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={customer.bookings} size="small" color="primary" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="medium">
                              {formatCurrency(customer.totalSpent)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(customer.totalSpent / customer.bookings)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
          
          {/* Second Row: Customer Statistics Cards */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)'
            },
            gap: { xs: 1.5, sm: 2 },
            mb: { xs: 2, sm: 3, md: 4 }
          }}>
            <StatsCard
              title="Total Customers"
              value={analyticsData.customers.total}
              icon={<PeopleOutlined />}
              color="primary"
              subtitle="All registered users"
            />
            <StatsCard
              title="New Customers"
              value={analyticsData.customers.new}
              icon={<PersonAddOutlined />}
              color="success"
              trend="up"
              subtitle="This period"
            />
            <StatsCard
              title="Returning Customers"
              value={analyticsData.customers.returning}
              icon={<RepeatOutlined />}
              color="info"
              subtitle="Multiple bookings"
            />
            <StatsCard
              title="Avg. Booking Value"
              value={formatCurrency(analyticsData.bookings.averageValue)}
              icon={<PaymentOutlined />}
              color="warning"
              subtitle="Per booking"
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default FocusedAnalyticsReports;

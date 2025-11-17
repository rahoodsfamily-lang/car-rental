import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Divider,
  alpha,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import {
  CurrencyExchangeOutlined,
  CheckCircleOutlined,
  PendingOutlined,
  CloseOutlined,
  InfoOutlined,
  RefreshOutlined,
  ReceiptOutlined
} from '@mui/icons-material';
import axiosInstance from '../../utils/axiosConfig';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatCurrency } from '../../utils/formatters';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const ModernRefundManagement = () => {
  const theme = useTheme();
  const { showToast } = useToast();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [activeTab, setActiveTab] = useState(0);
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [processedRefunds, setProcessedRefunds] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundNotes, setRefundNotes] = useState('');
  
  // Pagination state
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState(10);
  const [processedPage, setProcessedPage] = useState(0);
  const [processedRowsPerPage, setProcessedRowsPerPage] = useState(10);

  useEffect(() => {
    fetchRefunds();
    fetchStatistics();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const [pendingRes, processedRes] = await Promise.all([
        axiosInstance.get('/api/refunds/pending'),
        axiosInstance.get('/api/refunds/processed')
      ]);

      setPendingRefunds(pendingRes.data.data || []);
      setProcessedRefunds(processedRes.data.data || []);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      showToast('Failed to load refunds', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axiosInstance.get('/api/refunds/statistics');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        fetchRefunds(),
        fetchStatistics(),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum loading time for UX
      ]);
      showToast('Data refreshed successfully', { severity: 'success' });
    } catch (error) {
      console.error('Error refreshing data:', error);
      showToast('Failed to refresh data', { severity: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedRefund) return;

    try {
      setProcessingRefund(true);
      await axiosInstance.post(`/api/refunds/${selectedRefund._id}/process`, {
        refundNotes
      });

      showToast('Refund processed successfully', { severity: 'success' });
      setProcessDialogOpen(false);
      setSelectedRefund(null);
      setRefundNotes('');
      fetchRefunds();
      fetchStatistics();
    } catch (error) {
      console.error('Error processing refund:', error);
      showToast(error.response?.data?.message || 'Failed to process refund', { severity: 'error' });
    } finally {
      setProcessingRefund(false);
    }
  };

  const openProcessDialog = (refund) => {
    setSelectedRefund(refund);
    setProcessDialogOpen(true);
  };

  const closeProcessDialog = () => {
    setProcessDialogOpen(false);
    setSelectedRefund(null);
    setRefundNotes('');
  };

  const getPaymentMethodChip = (method) => {
    const colors = {
      gcash: 'primary',
      paymaya: 'secondary',
      cash: 'success'
    };

    return (
      <Chip
        label={method?.toUpperCase() || 'N/A'}
        color={colors[method] || 'default'}
        size="small"
      />
    );
  };

  // Pagination handlers for pending refunds
  const handlePendingPageChange = (event, newPage) => {
    setPendingPage(newPage);
  };

  const handlePendingRowsPerPageChange = (event) => {
    setPendingRowsPerPage(parseInt(event.target.value, 10));
    setPendingPage(0);
  };

  // Pagination handlers for processed refunds
  const handleProcessedPageChange = (event, newPage) => {
    setProcessedPage(newPage);
  };

  const handleProcessedRowsPerPageChange = (event) => {
    setProcessedRowsPerPage(parseInt(event.target.value, 10));
    setProcessedPage(0);
  };

  // Calculate paginated refunds
  const paginatedPendingRefunds = pendingRefunds.slice(
    pendingPage * pendingRowsPerPage,
    pendingPage * pendingRowsPerPage + pendingRowsPerPage
  );

  const paginatedProcessedRefunds = processedRefunds.slice(
    processedPage * processedRowsPerPage,
    processedPage * processedRowsPerPage + processedRowsPerPage
  );

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600} color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: alpha(theme.palette[color].main, 0.1),
              p: 1.5,
              borderRadius: 2
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

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
            <CurrencyExchangeOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
            Refund Management
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: { xs: 2, sm: 2.5, md: 3 },
              lineHeight: 1.6,
            }}
          >
            Manage customer refund requests and track processed refunds
          </Typography>
        </Box>
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
      </Box>

      {/* Main Tabs */}
      <Paper sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
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
            label="Pending Refunds"
            icon={<PendingOutlined />}
            iconPosition="start"
          />
          <Tab
            label="Processed Refunds"
            icon={<CheckCircleOutlined />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Pending Refunds Tab */}
          {activeTab === 0 && (
            <>
              {pendingRefunds.length === 0 ? (
                <Paper sx={{ p: 8, textAlign: 'center' }}>
                  <CheckCircleOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No Pending Refunds
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All refund requests have been processed
                  </Typography>
                </Paper>
              ) : isMobile || isTablet ? (
                <Stack spacing={2}>
                  {paginatedPendingRefunds.map((refund) => (
                    <Card key={refund._id}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Booking ID
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {refund.booking?.bookingId || refund.booking?._id}
                            </Typography>
                          </Box>
                          <Chip
                            label="PENDING"
                            color="warning"
                            size="small"
                          />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Customer
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {refund.user?.profile?.firstName && refund.user?.profile?.lastName
                                ? `${refund.user.profile.firstName} ${refund.user.profile.lastName}`
                                : refund.booking?.user?.profile?.firstName && refund.booking?.user?.profile?.lastName
                                ? `${refund.booking.user.profile.firstName} ${refund.booking.user.profile.lastName}`
                                : 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {refund.user?.email || refund.booking?.user?.email || ''}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Refund Amount
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="error">
                              ₱{refund.refundAmount?.toLocaleString()}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Payment Method
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {getPaymentMethodChip(refund.refundMethod)}
                            </Box>
                          </Grid>

                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Requested
                            </Typography>
                            <Typography variant="body2">
                              {dayjs(refund.refundRequestedAt).format('MMM D, YYYY')} ({dayjs(refund.refundRequestedAt).fromNow()})
                            </Typography>
                          </Grid>

                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Reason
                            </Typography>
                            <Typography variant="body2">
                              {refund.refundNotes || 'No notes'}
                            </Typography>
                          </Grid>
                        </Grid>

                        <Button
                          variant="contained"
                          color="success"
                          fullWidth
                          sx={{ mt: 2 }}
                          onClick={() => openProcessDialog(refund)}
                        >
                          Process Refund
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Booking ID</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Requested</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedPendingRefunds.map((refund) => (
                          <TableRow key={refund._id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {refund.booking?.bookingId || refund.booking?._id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {refund.user?.profile?.firstName && refund.user?.profile?.lastName
                                  ? `${refund.user.profile.firstName} ${refund.user.profile.lastName}`
                                  : refund.booking?.user?.profile?.firstName && refund.booking?.user?.profile?.lastName
                                  ? `${refund.booking.user.profile.firstName} ${refund.booking.user.profile.lastName}`
                                  : 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {refund.user?.email || refund.booking?.user?.email || ''}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} color="error">
                                ₱{refund.refundAmount?.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>{getPaymentMethodChip(refund.refundMethod)}</TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {dayjs(refund.refundRequestedAt).format('MMM D, YYYY')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {dayjs(refund.refundRequestedAt).fromNow()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={refund.refundNotes || 'No notes'}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {refund.refundNotes || 'No notes'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={() => openProcessDialog(refund)}
                              >
                                Process Refund
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {pendingRefunds.length > 0 && (
                    <TablePagination
                      component="div"
                      count={pendingRefunds.length}
                      page={pendingPage}
                      onPageChange={handlePendingPageChange}
                      rowsPerPage={pendingRowsPerPage}
                      onRowsPerPageChange={handlePendingRowsPerPageChange}
                      rowsPerPageOptions={[5, 10, 25, 50]}
                      labelRowsPerPage="Refunds per page:"
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
                  )}
                </>
              )}
            </>
          )}

          {/* Processed Refunds Tab */}
          {activeTab === 1 && (
            <>
              {processedRefunds.length === 0 ? (
                <Paper sx={{ p: 8, textAlign: 'center' }}>
                  <InfoOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No Processed Refunds
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Processed refunds will appear here
                  </Typography>
                </Paper>
              ) : isMobile || isTablet ? (
                <Stack spacing={2}>
                  {paginatedProcessedRefunds.map((refund) => (
                    <Card key={refund._id}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Booking ID
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {refund.booking?.bookingId || refund.booking?._id}
                            </Typography>
                          </Box>
                          <Chip
                            label="PROCESSED"
                            color="success"
                            size="small"
                          />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Customer
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {refund.user?.profile?.firstName && refund.user?.profile?.lastName
                                ? `${refund.user.profile.firstName} ${refund.user.profile.lastName}`
                                : refund.booking?.user?.profile?.firstName && refund.booking?.user?.profile?.lastName
                                ? `${refund.booking.user.profile.firstName} ${refund.booking.user.profile.lastName}`
                                : 'N/A'}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Refund Amount
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="success.main">
                              ₱{refund.refundAmount?.toLocaleString()}
                            </Typography>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Payment Method
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {getPaymentMethodChip(refund.refundMethod)}
                            </Box>
                          </Grid>

                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Processed Date
                            </Typography>
                            <Typography variant="body2">
                              {dayjs(refund.refundDate).format('MMM D, YYYY')} ({dayjs(refund.refundDate).fromNow()})
                            </Typography>
                          </Grid>

                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Processed By
                            </Typography>
                            <Typography variant="body2">
                              {refund.refundProcessedBy?.profile?.firstName && refund.refundProcessedBy?.profile?.lastName
                                ? `${refund.refundProcessedBy.profile.firstName} ${refund.refundProcessedBy.profile.lastName}`
                                : 'N/A'}
                            </Typography>
                          </Grid>

                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Notes
                            </Typography>
                            <Typography variant="body2">
                              {refund.refundNotes || 'No notes'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <>
                  <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Booking ID</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Processed Date</TableCell>
                        <TableCell>Processed By</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedProcessedRefunds.map((refund) => (
                        <TableRow key={refund._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {refund.booking?.bookingId || refund.booking?._id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {refund.user?.profile?.firstName && refund.user?.profile?.lastName
                                ? `${refund.user.profile.firstName} ${refund.user.profile.lastName}`
                                : refund.booking?.user?.profile?.firstName && refund.booking?.user?.profile?.lastName
                                ? `${refund.booking.user.profile.firstName} ${refund.booking.user.profile.lastName}`
                                : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              ₱{refund.refundAmount?.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>{getPaymentMethodChip(refund.refundMethod)}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {dayjs(refund.refundDate).format('MMM D, YYYY')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(refund.refundDate).fromNow()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {refund.refundProcessedBy?.profile?.firstName && refund.refundProcessedBy?.profile?.lastName
                                ? `${refund.refundProcessedBy.profile.firstName} ${refund.refundProcessedBy.profile.lastName}`
                                : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={refund.refundNotes || 'No notes'}>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {refund.refundNotes || 'No notes'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {processedRefunds.length > 0 && (
                  <TablePagination
                    component="div"
                    count={processedRefunds.length}
                    page={processedPage}
                    onPageChange={handleProcessedPageChange}
                    rowsPerPage={processedRowsPerPage}
                    onRowsPerPageChange={handleProcessedRowsPerPageChange}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Refunds per page:"
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
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Process Refund Dialog */}
      <Dialog
        open={processDialogOpen}
        onClose={closeProcessDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            m: isMobile ? 0 : 2,
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleOutlined color="success" />
              <Typography variant="h6" fontWeight={600}>
                Process Refund
              </Typography>
            </Box>
            <IconButton onClick={closeProcessDialog} size="small">
              <CloseOutlined />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedRefund && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Please process the refund manually via {selectedRefund.refundMethod?.toUpperCase()} before marking as processed.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Booking ID
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedRefund.booking?.bookingId || selectedRefund.booking?._id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedRefund.user?.profile?.firstName && selectedRefund.user?.profile?.lastName
                      ? `${selectedRefund.user.profile.firstName} ${selectedRefund.user.profile.lastName}`
                      : selectedRefund.booking?.user?.profile?.firstName && selectedRefund.booking?.user?.profile?.lastName
                      ? `${selectedRefund.booking.user.profile.firstName} ${selectedRefund.booking.user.profile.lastName}`
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Refund Amount
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="error">
                    ₱{selectedRefund.refundAmount?.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Refund Method
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getPaymentMethodChip(selectedRefund.refundMethod)}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Original Reason
                  </Typography>
                  <Typography variant="body2">
                    {selectedRefund.refundNotes || 'No reason provided'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <TextField
                fullWidth
                multiline
                rows={isMobile ? 4 : 3}
                label="Processing Notes (Optional)"
                placeholder="Add any notes about the refund processing..."
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: 2.5,
          bgcolor: alpha(theme.palette.background.default, 0.5),
          borderTop: 1,
          borderColor: 'divider',
          gap: 1,
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <Button 
            onClick={closeProcessDialog} 
            disabled={processingRefund}
            fullWidth={isMobile}
            variant={isMobile ? 'outlined' : 'text'}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleProcessRefund}
            disabled={processingRefund}
            fullWidth={isMobile}
            startIcon={processingRefund ? <CircularProgress size={20} /> : <CheckCircleOutlined />}
          >
            {processingRefund ? 'Processing...' : 'Mark as Processed'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ModernRefundManagement;

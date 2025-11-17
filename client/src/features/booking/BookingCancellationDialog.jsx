import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  AlertTitle,
  Divider,
  CircularProgress,
  IconButton,
  Paper,
  alpha,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CloseOutlined,
  WarningAmberOutlined,
  MoneyOffOutlined,
  InfoOutlined
} from '@mui/icons-material';
import axiosInstance from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const BookingCancellationDialog = ({ open, onClose, booking, onConfirm }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundPolicy, setRefundPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRefundPolicy();
    }
  }, [open]);

  const fetchRefundPolicy = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/refunds/policy');
      setRefundPolicy(response.data.data);
    } catch (error) {
      console.error('Error fetching refund policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRefundInfo = () => {
    if (!booking || !refundPolicy) return null;

    const hoursUntilPickup = dayjs(booking.startDate).diff(dayjs(), 'hour', true);
    
    let refundPercentage = 0;
    let description = '';

    if (hoursUntilPickup >= 24) {
      refundPercentage = 100;
      description = 'Full refund (100%)';
    } else if (hoursUntilPickup >= 12) {
      refundPercentage = 50;
      description = 'Partial refund (50%)';
    } else {
      refundPercentage = 0;
      description = 'No refund';
    }

    const refundAmount = (booking.totalPrice * refundPercentage) / 100;

    return {
      refundPercentage,
      refundAmount,
      description,
      hoursUntilPickup: Math.round(hoursUntilPickup * 10) / 10
    };
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(cancellationReason);
    setSubmitting(false);
    handleClose();
  };

  const handleClose = () => {
    setCancellationReason('');
    onClose();
  };

  const refundInfo = calculateRefundInfo();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        bgcolor: alpha(theme.palette.warning.main, 0.05),
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberOutlined color="warning" />
            <Typography variant="h6" fontWeight={600}>
              Cancel Booking
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={submitting}>
            <CloseOutlined />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Warning Alert */}
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Are you sure you want to cancel this booking?</AlertTitle>
              This action cannot be undone. Please review the refund information below.
            </Alert>

            {/* Booking Information */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.02)
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Booking Details
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Booking ID:</strong> {booking?.bookingId || booking?._id}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Car:</strong> {booking?.car?.year} {booking?.car?.make} {booking?.car?.model}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Pickup Date:</strong> {dayjs(booking?.startDate).format('MMM D, YYYY')}
              </Typography>
              <Typography variant="body2">
                <strong>Total Price:</strong> ₱{booking?.totalPrice?.toLocaleString()}
              </Typography>
            </Paper>

            {/* Refund Information - Only show for CONFIRMED bookings */}
            {booking?.status === 'confirmed' && refundInfo && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: refundInfo.refundPercentage > 0
                    ? alpha(theme.palette.success.main, 0.05)
                    : alpha(theme.palette.error.main, 0.05),
                  borderColor: refundInfo.refundPercentage > 0
                    ? theme.palette.success.main
                    : theme.palette.error.main
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <MoneyOffOutlined
                    color={refundInfo.refundPercentage > 0 ? 'success' : 'error'}
                  />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Refund Information
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Hours until pickup:</strong> {refundInfo.hoursUntilPickup} hours
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Refund Policy:</strong> {refundInfo.description}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color={refundInfo.refundPercentage > 0 ? 'success.main' : 'error.main'}
                >
                  Refund Amount: ₱{refundInfo.refundAmount.toLocaleString()}
                </Typography>

                {refundInfo.refundPercentage > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }} icon={<InfoOutlined />}>
                    Refunds are processed manually within 3-5 business days via your original payment method.
                  </Alert>
                )}
              </Paper>
            )}

            {/* No Refund Notice for PENDING bookings */}
            {booking?.status === 'pending' && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>No Payment Required</AlertTitle>
                This booking is still pending payment verification. No refund is applicable as no payment has been processed yet.
              </Alert>
            )}

            {/* Refund Policy Summary */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Refund Policy</AlertTitle>
              <Typography variant="body2" component="div">
                • Cancel 24+ hours before: 100% refund<br />
                • Cancel 12-24 hours before: 50% refund<br />
                • Cancel less than 12 hours: No refund
              </Typography>
            </Alert>

            {/* Cancellation Reason */}
            <TextField
              fullWidth
              multiline
              rows={isMobile ? 4 : 3}
              label="Cancellation Reason (Optional)"
              placeholder="Please tell us why you're cancelling..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              disabled={submitting}
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
        flexDirection: isMobile ? 'column-reverse' : 'row'
      }}>
        <Button
          onClick={handleClose}
          disabled={submitting}
          fullWidth={isMobile}
          variant={isMobile ? 'outlined' : 'text'}
        >
          Keep Booking
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={submitting || loading}
          fullWidth={isMobile}
          startIcon={submitting ? <CircularProgress size={20} /> : <WarningAmberOutlined />}
        >
          {submitting ? 'Cancelling...' : 'Cancel Booking'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingCancellationDialog;

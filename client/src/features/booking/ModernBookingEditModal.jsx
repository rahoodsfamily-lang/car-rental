import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Divider,
  Alert,
  Stack,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Close as CloseOutlined, Edit, DirectionsCar as DirectionsCarOutlined, LocationOn, Save as SaveOutlined, AttachMoneyOutlined, InfoOutlined } from '@mui/icons-material';
import { useBooking } from './BookingContext';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastProvider';
import axiosInstance from '../../utils/axiosConfig';
import { LocalizationProvider, DatePicker, PickersDay } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);
import { formatBookingId } from '../../utils/formatters';
import { getMinimumBookingDate, getBookingRestrictionMessage, RENTAL_CONFIG } from '../../utils/rentalConfig';

const ModernBookingEditModal = ({ open, onClose, booking, onSuccess }) => {
  const { updateBooking } = useBooking();
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    startDate: null,
    endDate: null,
    pickupLocation: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricePreview, setPricePreview] = useState(null);
  const [unavailableRanges, setUnavailableRanges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking && open) {
      setFormData({
        startDate: dayjs(booking.startDate),
        endDate: dayjs(booking.endDate),
        pickupLocation: booking.location || booking.pickupLocation || booking.car?.location || 'Not specified',
      });
      // Fetch unavailable dates when modal opens
      if (booking.car?._id) {
        fetchUnavailableDates(booking.car._id);
      }
    }
  }, [booking, open]);

  useEffect(() => {
    // Calculate price preview when dates change
    if (formData.startDate && formData.endDate && booking?.car) {
      const start = formData.startDate.toDate();
      const end = formData.endDate.toDate();
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      if (days > 0) {
        setPricePreview(days * booking.car.pricePerDay);
      } else {
        setPricePreview(null);
      }
    }
  }, [formData.startDate, formData.endDate, booking]);

  const fetchUnavailableDates = async (carId) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/bookings/car/${carId}/unavailable`);
      
      if (response.data.success) {
        // Filter out the current booking from unavailable ranges
        const filteredRanges = (response.data.data || []).filter(
          range => range.bookingId !== booking._id
        );
        setUnavailableRanges(filteredRanges);
      }
    } catch (err) {
      console.error('Failed to load booking availability:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine if a day should be highlighted/disabled
  const isDateUnavailable = (day) => {
    return unavailableRanges.some(range =>
      day.isBetween(dayjs(range.startDate).startOf('day'), dayjs(range.endDate).endOf('day'), null, '[]')
    );
  };

  // Custom day component for highlighting
  const CustomPickersDay = (pickersDayProps) => {
    const { day, outsideCurrentMonth, disabled, ...other } = pickersDayProps;
    const dayJsObj = dayjs(day);
    const unavailable = isDateUnavailable(dayJsObj);
    const isBeforeToday = dayJsObj.isBefore(dayjs(), 'day');
    const isToday = dayJsObj.isSame(dayjs(), 'day');
    
    // Check if this day is the selected start or end date
    const isStartDate = formData.startDate && dayJsObj.isSame(formData.startDate, 'day');
    const isEndDate = formData.endDate && dayJsObj.isSame(formData.endDate, 'day');
    
    // Check if this day is within the selected range
    const isInRange = formData.startDate && formData.endDate && 
      dayJsObj.isAfter(formData.startDate, 'day') && 
      dayJsObj.isBefore(formData.endDate, 'day');
    
    // Don't disable today, only past dates
    const isDisabled = disabled || unavailable || isBeforeToday;
    
    let sxStyles = {};
    
    if (unavailable) {
      sxStyles = { 
        bgcolor: 'error.main', 
        color: 'common.white', 
        '&:hover': { bgcolor: 'error.dark' } 
      };
    } else if (isStartDate || isEndDate) {
      // Highlight selected start and end dates
      sxStyles = { 
        bgcolor: 'primary.main', 
        color: 'common.white',
        fontWeight: 'bold',
        '&:hover': { bgcolor: 'primary.dark' }
      };
    } else if (isInRange) {
      // Highlight dates in the selected range
      sxStyles = { 
        bgcolor: alpha(theme.palette.primary.main, 0.2), 
        color: 'primary.dark',
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.3) }
      };
    } else if (!isBeforeToday && !outsideCurrentMonth) {
      // Style available dates (including today) as green
      sxStyles = { 
        bgcolor: 'success.light', 
        color: 'common.white', 
        '&:hover': { bgcolor: 'success.main' }
      };
      // Make today slightly darker to stand out
      if (isToday) {
        sxStyles.bgcolor = 'success.main';
        sxStyles.fontWeight = 'bold';
      }
    }

    return (
      <PickersDay
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        disabled={isDisabled}
        sx={{
          ...sxStyles,
          // Override MUI's default today styling
          '&.MuiPickersDay-today': isToday && !unavailable && !isBeforeToday ? {
            bgcolor: 'success.main !important',
            color: 'common.white !important',
            fontWeight: 'bold',
            border: 'none !important',
            '&:hover': { 
              bgcolor: 'success.dark !important' 
            }
          } : {},
          // Ensure our custom styles take precedence
          '&.MuiPickersDay-root': sxStyles
        }}
        {...other}
      />
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = formData.startDate.toDate();
      const end = formData.endDate.toDate();
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    }
    return 0;
  };

  const calculateTotalPrice = () => {
    const days = calculateDays();
    if (days > 0 && booking?.car?.pricePerDay) {
      return (days * booking.car.pricePerDay).toFixed(2);
    }
    return '0.00';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate) {
      showToast('Please select both start and end dates', 'error');
      return;
    }

    if (formData.startDate.isSame(formData.endDate, 'day') || formData.startDate.isAfter(formData.endDate)) {
      showToast('End date must be at least one day after start date', 'error');
      return;
    }
    
    // Check against minimum booking date based on time restrictions
    const minBookingDate = getMinimumBookingDate();
    if (formData.startDate.isBefore(minBookingDate, 'day')) {
      showToast(getBookingRestrictionMessage(), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {};
      
      // Only include fields that have changed
      if (!formData.startDate.isSame(dayjs(booking.startDate), 'day')) {
        updateData.startDate = formData.startDate.toISOString();
      }
      if (!formData.endDate.isSame(dayjs(booking.endDate), 'day')) {
        updateData.endDate = formData.endDate.toISOString();
      }

      const result = await updateBooking(booking._id, updateData);
      
      if (result.success) {
        showToast('Booking updated successfully!', 'success');
        onSuccess && onSuccess();
        onClose();
      } else {
        showToast(result.message || 'Failed to update booking', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update booking', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  // Check if user can modify this booking
  const canModify = booking.status === 'pending' && 
    (booking.user._id === user?.id || booking.user._id === user?._id || user?.role === 'admin');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          width: '100%',
          maxWidth: 500,
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.98)} 0%, 
            ${alpha(theme.palette.background.paper, 1)} 100%)`,
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        py: { xs: 1.5, sm: 2 },
        px: { xs: 2, sm: 2.5 }
      }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Modify Booking
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {booking.bookingId || formatBookingId(booking._id)}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseOutlined />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ 
        pt: { xs: 2, sm: 2.5 }, 
        pb: { xs: 2, sm: 2.5 },
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 0 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: { xs: 'flex-start', sm: 'center' },
        minHeight: { xs: '400px', sm: '480px' },
        maxHeight: { xs: '70vh', sm: '80vh' },
        overflow: 'auto'
      }}>
        {!canModify ? (
          <Alert severity="warning">
            Only pending bookings can be modified.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%'
          }}>
            {dayjs().hour() >= RENTAL_CONFIG.BOOKING_RULES.CUTOFF_TIME && (
              <Alert 
                severity="info" 
                icon={<InfoOutlined />}
                sx={{ mb: 2, py: 0.5 }}
              >
                After 5:00 PM: Bookings for today are closed. You can book for tomorrow or any future date.
              </Alert>
            )}
            <Stack spacing={{ xs: 3, sm: 2 }} sx={{ flex: 1, justifyContent: { xs: 'flex-start', sm: 'center' } }}>
              {/* Car Details Card */}
              <Card variant="outlined" sx={{ borderRadius: { xs: 1.5, sm: 2 } }}>
                <CardContent sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 2.5 } }}>
                  <Typography 
                    variant="h6" 
                    fontWeight={600} 
                    gutterBottom 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                    }}
                  >
                    <DirectionsCarOutlined color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    {booking.car?.year} {booking.car?.make} {booking.car?.model}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5, 
                      mb: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    }}
                  >
                    <LocationOn sx={{ fontSize: { xs: 16, sm: 18 } }} />
                    {booking.car?.location || formData.pickupLocation || 'Location not specified'}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
                      {[
                        booking.car?.bodyType || 'Standard',
                        booking.car?.fuelType || 'Gas',
                        booking.car?.transmission || 'Automatic'
                      ].filter(Boolean).join(' • ')}
                    </Typography>
                    <Chip 
                      label={`₱${booking.car?.pricePerDay}/day`}
                      color="primary"
                      variant="filled"
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Date and Location Fields Container */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: { xs: 3, sm: 2 },
                alignItems: 'center',
                my: { xs: 1, sm: 'auto' },
                px: { xs: 1, sm: 0 }
              }}>

                {/* Start Date */}
                <Box sx={{ maxWidth: 280, width: '100%' }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Start Date"
                      value={formData.startDate}
                      onChange={(newValue) => {
                        setFormData(prev => ({ ...prev, startDate: newValue }));
                      }}
                      minDate={getMinimumBookingDate()}
                      shouldDisableDate={isDateUnavailable}
                      slots={{ day: CustomPickersDay }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          sx: {
                            '& .MuiInputBase-root': {
                              height: 56
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>

                </Box>

                {/* End Date */}
                <Box sx={{ maxWidth: 280, width: '100%' }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="End Date"
                      value={formData.endDate}
                      onChange={(newValue) => {
                        setFormData(prev => ({ ...prev, endDate: newValue }));
                      }}
                      minDate={formData.startDate || dayjs()}
                      shouldDisableDate={isDateUnavailable}
                      slots={{ day: CustomPickersDay }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          sx: {
                            '& .MuiInputBase-root': {
                              height: 56
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Box>


              </Box>

              {/* Total Price Card */}
              <Card 
                variant="outlined" 
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: { xs: 1.5, sm: 2 },
                }}
              >
                <CardContent sx={{ py: { xs: 2, sm: 2.5 }, px: { xs: 2, sm: 3 } }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    color="text.secondary"
                    sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                  >
                    Total Price
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                    <Typography 
                      variant="h4" 
                      color="primary" 
                      fontWeight={700}
                      sx={{ 
                        letterSpacing: '-0.5px',
                        fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
                      }}
                    >
                      ₱{calculateTotalPrice()}
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                  >
                    {calculateDays()} {calculateDays() === 1 ? 'day' : 'days'} × ₱{booking.car?.pricePerDay?.toLocaleString()}/day
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        )}
      </DialogContent>

      {canModify && (
        <>
          <Divider />
          <DialogActions sx={{ p: 2.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveOutlined />}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : (isMobile ? 'Update' : 'Update Booking')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default ModernBookingEditModal;
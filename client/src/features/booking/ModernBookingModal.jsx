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
  useTheme
} from '@mui/material';
import { Close as CloseOutlined, DirectionsCar, LocationOn, CheckCircle } from '@mui/icons-material';
import { useBooking } from './BookingContext';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastProvider';
import axiosInstance from '../../utils/axiosConfig';
import { LocalizationProvider, DatePicker, PickersDay } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { getMinimumBookingDate, getBookingRestrictionMessage } from '../../utils/rentalConfig';
dayjs.extend(isBetween);

const ModernBookingModal = ({ open, onClose, car, onSuccess }) => {
  const { createBooking } = useBooking();
  const { user, token } = useAuth();
  const toast = useToast();
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    startDate: null,
    endDate: null,
    pickupLocation: ''
  });
  const [unavailableRanges, setUnavailableRanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLocation, setHasLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    if (car && open) {
      setFormData({
        startDate: null,
        endDate: null,
        pickupLocation: ''
      });
      // Fetch unavailable dates when modal opens
      if (car?._id) {
        fetchUnavailableDates(car._id);
      }
    }
  }, [car, open]);

  // Fetch user location status
  useEffect(() => {
    const fetchLocationStatus = async () => {
      if (!user?._id && !user?.id) {
        setLocationLoading(false);
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        const response = await axiosInstance.get('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userProfile = response.data.user?.profile || response.data.profile;
        setHasLocation(!!userProfile?.address?.trim());
      } catch (err) {
        console.error('Failed to fetch location status:', err);
        setHasLocation(false);
      } finally {
        setLocationLoading(false);
      }
    };
    
    // Fetch when modal opens or user changes
    if (open) {
      fetchLocationStatus();
    }
  }, [user, token, open]);

  const fetchUnavailableDates = async (carId) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/bookings/car/${carId}/unavailable`);
      
      if (response.data.success) {
        setUnavailableRanges(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load booking availability:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for calculations
  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = formData.startDate.toDate();
    const end = formData.endDate.toDate();
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / msPerDay);
  };

  const calculateTotalPrice = () => {
    const days = calculateDays();
    return (days * (car?.pricePerDay || 0)).toFixed(2);
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

  const handleClose = () => {
    // Reset form data
    setFormData({
      startDate: null,
      endDate: null,
      pickupLocation: '',
    });
    setIsSubmitting(false);
    // Call parent's onClose
    onClose();
  };

  const validateForm = () => {
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select both start and end dates');
      return false;
    }
    
    if (formData.startDate.isSame(formData.endDate, 'day') || formData.startDate.isAfter(formData.endDate)) {
      toast.error('End date must be at least one day after start date');
      return false;
    }
    
    // Check against minimum booking date based on 5 PM cutoff rule
    const minBookingDate = getMinimumBookingDate();
    if (formData.startDate.isBefore(minBookingDate, 'day')) {
      toast.error(getBookingRestrictionMessage());
      return false;
    }
    
    // Pickup location is automatically set from user's profile address
    
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    // Check location status first
    if (!hasLocation) {
      toast.error('Please set your location in your profile before booking a car.');
      return;
    }

    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const bookingData = {
        user: user._id || user.id,
        car: car._id,
        startDate: formData.startDate ? formData.startDate.toISOString() : null,
        endDate: formData.endDate ? formData.endDate.toISOString() : null,
        // Location will be automatically set to user's profile address by backend
      };

      const response = await createBooking(bookingData);
      
      if (response.success) {
        toast.success('Booking created successfully! Redirecting to payment...');
        
        // Call success callback immediately
        onSuccess && onSuccess(response.data);
        
        // Then close the modal
        handleClose();
      } else {
        throw new Error(response.message || 'Failed to create booking');
      }
    } catch (error) {
      const errorMessage = error.message || 'An error occurred while creating the booking';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canBook = !locationLoading && hasLocation;
  const showLocationWarning = !locationLoading && !hasLocation;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullScreen={{ xs: true, sm: false }}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2 },
          width: '100%',
          maxWidth: { xs: '100%', sm: 500 },
          m: { xs: 0, sm: 2 },
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
          <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Book Vehicle
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
            Complete your booking details
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
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
        {locationLoading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            minHeight: { xs: '300px', sm: '480px' }
          }}>
            <CircularProgress />
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ mt: 2 }}
            >
              Checking location...
            </Typography>
          </Box>
        ) : showLocationWarning ? (
          <Alert severity="warning" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
            Please set your location in your profile before booking a car. This helps us serve you better.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%'
          }}>
            <Stack spacing={{ xs: 3, sm: 2 }} sx={{ flex: 1, justifyContent: { xs: 'flex-start', sm: 'center' } }}>
              {/* Operating Hours Notice */}
              {dayjs().hour() >= 17 && (
                <Alert severity="info" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  <strong>After 5:00 PM:</strong> Bookings for today are closed. You can book for tomorrow or any future date.
                </Alert>
              )}
              
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
                    <DirectionsCar color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    {car?.year} {car?.make} {car?.model}
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
                    {car?.location || 'Location not specified'}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
                      {[
                        car?.bodyType || 'Standard',
                        car?.fuelType || 'Gas',
                        car?.transmission || 'Automatic'
                      ].filter(Boolean).join(' • ')}
                    </Typography>
                    <Chip 
                      label={`₱${car?.pricePerDay}/day`}
                      color="primary"
                      variant="filled"
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
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
                          helperText: dayjs().hour() >= 17 ? 'After 5 PM: Tomorrow onwards only' : 'Available from today',
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
                    {calculateDays()} {calculateDays() === 1 ? 'day' : 'days'} × ₱{car?.pricePerDay?.toLocaleString()}/day
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        )}
      </DialogContent>

      <>
        <Divider />
        {canBook && (
          <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: { xs: 1.5, sm: 2 }, pb: 0 }}>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                display: 'block',
                textAlign: 'center',
                fontStyle: 'italic',
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
              }}
            >
              💡 You'll be redirected to payment after confirming.
            </Typography>
          </Box>
        )}
        <DialogActions sx={{ 
          p: { xs: 2, sm: 2.5 },
          pt: canBook ? { xs: 1.5, sm: 1.5 } : { xs: 2, sm: 2.5 },
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
        }}>
          {locationLoading ? (
            <Box sx={{ height: 36 }} />
          ) : canBook ? (
            <>
              <Button
                variant="outlined"
                color="inherit"
                onClick={onClose}
                disabled={isSubmitting}
                fullWidth={{ xs: true, sm: false }}
                sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckCircle />}
                disabled={isSubmitting || loading}
                fullWidth={{ xs: true, sm: false }}
                sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}
              >
                {isSubmitting ? 'Creating Booking...' : 'Confirm Booking'}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                onClose();
                window.location.href = '/profile';
              }}
              fullWidth={{ xs: true, sm: false }}
              sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}
            >
              Set Location in Profile
            </Button>
          )}
        </DialogActions>
      </>
    </Dialog>
  );
};

export default ModernBookingModal;
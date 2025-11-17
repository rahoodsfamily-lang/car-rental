import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  TextField,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  Alert
} from '@mui/material';
import { CloudUpload, CheckCircle, Payment as PaymentIcon } from '@mui/icons-material';
import axios from '../../utils/axiosConfig';
import { useToast } from '../../components/feedback/ToastProvider';

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const progressRestored = useRef(false);
  
  const [booking, setBooking] = useState(null);
  const [settings, setSettings] = useState(null);
  const [payment, setPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const toast = useToast();

  // Dynamic steps based on payment method
  const steps = paymentMethod === 'cash' 
    ? ['Select Payment Method', 'Confirmation'] 
    : ['Select Payment Method', 'Scan QR Code', 'Upload Proof', 'Confirmation'];

  // Save payment progress when step or method changes (but not on initial load)
  useEffect(() => {
    if (bookingId && activeStep < 3 && progressRestored.current) {
      localStorage.setItem(`payment_progress_${bookingId}`, JSON.stringify({
        step: activeStep,
        method: paymentMethod
      }));
    }
  }, [activeStep, paymentMethod, bookingId]);

  useEffect(() => {
    const initializePage = async () => {
      // Restore progress first
      const savedProgress = localStorage.getItem(`payment_progress_${bookingId}`);
      
      if (savedProgress) {
        try {
          const { step, method } = JSON.parse(savedProgress);
          setActiveStep(step);
          if (method) {
            setPaymentMethod(method);
          }
        } catch (e) {
          console.error('Error restoring payment progress:', e);
        }
      }
      
      // Then fetch data
      await fetchBooking();
      await fetchSettings();
      await checkExistingPayment();
      
      // Mark that we've checked for saved progress - delay slightly to prevent immediate save
      setTimeout(() => {
        progressRestored.current = true;
      }, 100);
    };
    
    initializePage();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // API returns { success: true, data: booking }
      const bookingData = response.data.data || response.data;
      setBooking(bookingData);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get('/api/payments/settings');
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const checkExistingPayment = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`/api/payments/booking/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayment(data);
      if (data.status === 'verified') {
        setActiveStep(3);
      }
    } catch (error) {
      // No payment yet, that's okay
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${path.replace(/\\/g, '/')}`;
  };

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    // Cash on Pickup - no proof required
    if (paymentMethod === 'cash') {
      try {
        setLoading(true);

        const token = localStorage.getItem('token');
        await axios.post('/api/payments', {
          bookingId,
          amount: booking.totalPrice,
          paymentMethod: 'cash',
          notes: 'Cash on Delivery - Payment will be collected at vehicle delivery'
        }, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        // Clear saved progress after successful submission
        localStorage.removeItem(`payment_progress_${bookingId}`);
        
        setActiveStep(3);
        
        // Redirect after 4-5 seconds
        setTimeout(() => {
          navigate('/bookings');
        }, 4500);
      } catch (error) {
        console.error('Error submitting cash payment:', error);
        toast.error('Failed to submit payment');
      } finally {
        setLoading(false);
      }
      return;
    }

    // GCash/PayMaya - require proof upload
    if (!proofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    if (!booking || !booking.totalPrice) {
      toast.error('Booking data not loaded. Please refresh the page.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('bookingId', bookingId);
      formData.append('amount', booking.totalPrice.toString());
      formData.append('paymentMethod', paymentMethod);
      formData.append('paymentProof', proofFile);

      const token = localStorage.getItem('token');
      await axios.post('/api/payments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        timeout: 60000, // 60 seconds for image upload
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${percentCompleted}%`);
        }
      });

      // Clear saved progress after successful submission
      localStorage.removeItem(`payment_progress_${bookingId}`);
      
      setActiveStep(3);
      
      setTimeout(() => {
        navigate('/bookings');
      }, 3000);
    } catch (error) {
      // Provide specific error messages based on error type
      if (error.code === 'ECONNABORTED') {
        toast.error('Upload timeout. Please check your internet connection and try again with a smaller image.');
      } else if (error.response?.status === 413) {
        toast.error('Image file is too large. Please use a smaller image (max 5MB).');
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit payment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!booking || !settings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (payment && payment.status === 'verified') {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Payment Verified!
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Your booking is confirmed. Your vehicle will be delivered on the scheduled date.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/my-bookings')}
            sx={{ mt: 3 }}
          >
            View My Bookings
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 0, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          fontWeight: 600, 
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
          px: { xs: 2, sm: 0 },
        }}
      >
        Complete Your Payment
      </Typography>

      <Stepper 
        activeStep={activeStep} 
        sx={{ 
          display: { xs: 'none', sm: 'flex' },
          mb: 4,
          '& .MuiStepLabel-label': {
            fontSize: '0.875rem',
          },
        }}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Mobile: Simple Step Indicator */}
      <Box 
        sx={{ 
          display: { xs: 'flex', sm: 'none' },
          justifyContent: 'center',
          alignItems: 'center',
          mb: 3,
          px: 2,
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600,
            color: 'primary.main',
            bgcolor: (theme) => `${theme.palette.primary.main}15`,
            px: 2,
            py: 1,
            borderRadius: 2,
          }}
        >
          Step {activeStep + 1} of {steps.length}: {steps[activeStep]}
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 0, sm: 3 }} sx={{ justifyContent: 'center' }}>
        {/* Booking Summary - First on mobile, left on desktop */}
        <Grid item xs={12} md={4} sx={{ order: { xs: 1, md: 1 }, mb: { xs: 2, sm: 0 } }}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3 }, 
            position: { xs: 'static', md: 'sticky' }, 
            top: 20, 
            height: 'fit-content',
            borderRadius: { xs: 0, sm: 1 },
          }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
              }}
            >
              Booking Summary
            </Typography>
            <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Vehicle
            </Typography>
            <Typography variant="body1" gutterBottom>
              {booking?.car?.make || 'N/A'} {booking?.car?.model || ''}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
              Rental Period
            </Typography>
            <Typography variant="body1" gutterBottom>
              {booking?.startDate && booking?.endDate 
                ? `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}`
                : 'N/A'}
            </Typography>
            
            <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                Total
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                ₱{booking?.totalPrice?.toLocaleString() || '0'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Payment Form - Second on mobile, right on desktop */}
        <Grid item xs={12} md={8} sx={{ 
          order: { xs: 2, md: 2 },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          {activeStep === 0 && (
            <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: { xs: '100%', sm: 500 }, borderRadius: { xs: 0, sm: 1 } }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                Select Payment Method
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {(settings?.enabledMethods?.gcash === true) && (
                    <FormControlLabel value="gcash" control={<Radio />} label="GCash" />
                  )}
                  {(settings?.enabledMethods?.paymaya === true) && (
                    <FormControlLabel value="paymaya" control={<Radio />} label="PayMaya" />
                  )}
                  {(settings?.enabledMethods?.cash === true) && (
                    <FormControlLabel value="cash" control={<Radio />} label="Cash on Delivery" />
                  )}
                </RadioGroup>
              </FormControl>
              <Button
                variant="contained"
                onClick={() => {
                  if (paymentMethod === 'cash') {
                    // For cash, submit directly
                    handleSubmit();
                  } else {
                    // For GCash/PayMaya, go to QR code step
                    setActiveStep(1);
                  }
                }}
                sx={{ mt: 3 }}
                fullWidth
                disabled={loading}
                startIcon={loading && paymentMethod === 'cash' ? <CircularProgress size={20} /> : null}
              >
                {loading && paymentMethod === 'cash' ? 'Processing...' : 'Continue'}
              </Button>
            </Paper>
          )}

          {activeStep === 1 && paymentMethod !== 'cash' && (
            <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: { xs: '100%', sm: 500 }, borderRadius: { xs: 0, sm: 1 } }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                Scan QR Code
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                {settings.paymentInstructions}
              </Alert>
              
              {paymentMethod === 'gcash' && settings.gcashQRCode && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Account Name: {settings.gcashName}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    GCash Number: {settings.gcashNumber}
                  </Typography>
                  <Card sx={{ maxWidth: 400, mx: 'auto', mt: 2 }}>
                    <CardMedia
                      component="img"
                      image={getImageUrl(settings.gcashQRCode)}
                      alt="GCash QR Code"
                      sx={{ height: 400, objectFit: 'contain' }}
                    />
                  </Card>
                </Box>
              )}

              {paymentMethod === 'paymaya' && settings.paymayaQRCode && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Account Name: {settings.paymayaName}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    PayMaya Number: {settings.paymayaNumber}
                  </Typography>
                  <Card sx={{ maxWidth: 400, mx: 'auto', mt: 2 }}>
                    <CardMedia
                      component="img"
                      image={getImageUrl(settings.paymayaQRCode)}
                      alt="PayMaya QR Code"
                      sx={{ height: 400, objectFit: 'contain' }}
                    />
                  </Card>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button onClick={() => setActiveStep(0)} fullWidth>
                  Back
                </Button>
                <Button variant="contained" onClick={() => setActiveStep(2)} fullWidth>
                  I've Paid
                </Button>
              </Box>
            </Paper>
          )}

          {activeStep === 2 && (
            <Box sx={{ width: '100%', maxWidth: '100%' }}>
              <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  Upload Payment Proof
                </Typography>
                
                {proofPreview && (
                  <Card sx={{ mb: 2, maxWidth: { xs: '100%', sm: 400 }, mx: 'auto' }}>
                    <CardMedia
                      component="img"
                      image={proofPreview}
                      alt="Payment Proof"
                      sx={{ height: { xs: 200, sm: 300 }, objectFit: 'contain' }}
                    />
                  </Card>
                )}

                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {proofFile ? 'Change Screenshot' : 'Upload Screenshot'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleProofUpload}
                  />
                </Button>

                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' }, 
                  gap: { xs: 1.5, sm: 2 },
                  alignItems: 'stretch'
                }}>
                  <Button onClick={() => setActiveStep(1)} fullWidth>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading || !proofFile}
                    fullWidth
                    startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
                    sx={{
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                      px: { xs: 2, sm: 3 },
                      minWidth: 'fit-content',
                      '& .MuiButton-startIcon': {
                        marginRight: 1
                      }
                    }}
                  >
                    {loading ? 'Submitting...' : 'Submit Payment'}
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}

          {activeStep === 3 && (
            <Paper sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', width: '100%', maxWidth: 600, borderRadius: { xs: 0, sm: 1 } }}>
              <CheckCircle sx={{ fontSize: { xs: 60, sm: 80 }, color: 'success.main', mb: { xs: 1.5, sm: 2 } }} />
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                {paymentMethod === 'cash' ? 'Cash on Delivery Selected!' : 'Payment Submitted Successfully!'}
              </Typography>
              
              {paymentMethod === 'cash' ? (
                <>
                  <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                      }}
                    >
                      {booking.car.year} {booking.car.make} {booking.car.model}
                    </Typography>
                    <Typography variant="body2">
                      Please pay upon vehicle delivery. Have the exact amount or sufficient cash ready.
                    </Typography>
                  </Alert>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    Payment will be collected when the vehicle is delivered to you.
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                    Your payment proof has been received.
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                    Please wait for admin verification.
                  </Typography>
                </>
              )}
              
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2">
                  You'll be redirected to your bookings shortly...
                </Typography>
              </Alert>
              <CircularProgress size={24} />
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default PaymentPage;

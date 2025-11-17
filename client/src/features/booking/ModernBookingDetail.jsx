import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Divider,
  Paper,
  useTheme,
  alpha,
  IconButton,
  Breadcrumbs,
  Link,
  Dialog,
  DialogContent,
  DialogActions,

} from '@mui/material';
import {
  ArrowBackOutlined,
  BookOnlineOutlined,
  DirectionsCarOutlined,
  CalendarTodayOutlined,
  EventOutlined,
  LocationOnOutlined,
  PaymentOutlined,
  PersonOutlined,
  PhoneOutlined,
  EmailOutlined,
  CheckCircleOutlined,
  PendingOutlined,
  ErrorOutlined,
  EditOutlined,
  CancelOutlined,
  ChevronLeft,
  ChevronRight,
  Close,
  LocalGasStationOutlined,
  SettingsOutlined,
  CategoryOutlined,
  AirlineSeatReclineNormalOutlined,
  LuggageOutlined,
  DescriptionOutlined,
  FeaturedPlayListOutlined,
  AccessTimeOutlined,
  LocationCityOutlined,
  HomeOutlined,
  CurrencyExchangeOutlined,
  CalculateOutlined,
  CreditCardOutlined,
  NoteOutlined,
  ConfirmationNumberOutlined,
  TimerOutlined,
  PlaceOutlined,
  MyLocationOutlined,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useBooking } from './BookingContext';
import { useAuth } from '../auth/AuthContext';
import { PageLoader } from '../../components/feedback/LoadingSpinner';
import { useToast } from '../../components/feedback/ToastProvider';
import axiosInstance from '../../utils/axiosConfig';
import { getImageUrl } from '../../utils/imageHelper';
import { formatBookingId } from '../../utils/formatters';

// Custom Philippine Peso Icon Component
const PesoIcon = ({ sx = {} }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      fontSize: 14,
      fontWeight: 'bold',
      color: 'text.secondary',
      ...sx
    }}
  >
    ₱
  </Box>
);

const ModernBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBookingById, cancelBooking } = useBooking();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const theme = useTheme();
  const toast = useToast();

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const bookingData = await getBookingById(id);
        setBooking(bookingData);
      } catch (error) {
        setError(error.message || 'Failed to load booking details');
        toast.error('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    if (id && !booking) {
      fetchBooking();
    }
  }, [id]); // Remove function dependencies to prevent infinite loop

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'active':
        return 'primary'; // Active bookings (currently renting)
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleOutlined />;
      case 'pending':
        return <PendingOutlined />;
      case 'active':
        return <DirectionsCarOutlined />; // Car icon for active rentals
      case 'cancelled':
        return <ErrorOutlined />;
      case 'completed':
        return <CheckCircleOutlined />;
      default:
        return <PendingOutlined />;
    }
  };

  const handleCancelBooking = async () => {
    try {
      await cancelBooking(booking._id);
      toast.success('Booking cancelled successfully');
      setBooking({ ...booking, status: 'cancelled' });
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleEditBooking = () => {
    navigate(`/bookings/${booking._id}/edit`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Booking Details - ${booking.car?.make} ${booking.car?.model}`,
        text: `My car rental booking for ${booking.car?.make} ${booking.car?.model}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  // Get appropriate back navigation path based on user role
  const getBackPath = () => {
    return user?.role === 'admin' ? '/admin/bookings?tab=0' : '/my-bookings';
  };

  const getBackLabel = () => {
    return user?.role === 'admin' ? 'Booking Management' : 'My Bookings';
  };

  const nextImage = () => {
    if (booking.car?.imageUrls && booking.car.imageUrls.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === booking.car.imageUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (booking.car?.imageUrls && booking.car.imageUrls.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? booking.car.imageUrls.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return <PageLoader message="Loading booking details..." />;
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            Unable to Load Booking Details
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(getBackPath())}
            sx={{ mr: 2 }}
          >
            Back to {getBackLabel()}
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  if (!booking) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" color="error">
          Booking not found
        </Typography>
      </Container>
    );
  }

  const totalDays = Math.ceil(
    (new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
    <Box>
      {/* Header - Car Details Style */}
      <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton onClick={() => navigate(getBackPath())} sx={{ mr: 1 }}>
              <ArrowBackOutlined />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
              {booking.car ? `${booking.car.year || ''} ${booking.car.make || ''} ${booking.car.model || ''}`.trim() : 'Booking Details'}
            </Typography>

            
            <Chip 
              icon={getStatusIcon(booking.status)}
              label={booking.status?.toUpperCase()}
              color={getStatusColor(booking.status)}
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', ml: '64px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ConfirmationNumberOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Booking ID:
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {booking.bookingId || formatBookingId(booking._id)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Image Gallery */}
          <Card sx={{ width: '100%' }}>
            {booking.car?.imageUrls && booking.car.imageUrls.length > 0 ? (
              <>
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    image={
                      getImageUrl(booking.car.imageUrls[selectedImageIndex])
                    }
                    alt={`${booking.car?.make} ${booking.car?.model}`}
                    sx={{ 
                      height: { xs: '250px', sm: '400px', md: '500px' },
                      width: '100%',
                      objectFit: 'cover',
                      bgcolor: '#f5f5f5'
                    }}
                  />
                  
                  {booking.car.imageUrls.length > 1 && (
                    <>
                      <IconButton
                        sx={{
                          position: 'absolute',
                          left: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                        }}
                        onClick={prevImage}
                      >
                        <ChevronLeft />
                      </IconButton>
                      
                      <IconButton
                        sx={{
                          position: 'absolute',
                          right: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                        }}
                        onClick={nextImage}
                      >
                        <ChevronRight />
                      </IconButton>
                    </>
                  )}
                </Box>
                
                {booking.car.imageUrls.length > 1 && (
                  <Box sx={{ p: { xs: 1, sm: 2 } }}>
                    <Grid container spacing={1}>
                      {booking.car.imageUrls.map((url, index) => (
                        <Grid item xs={6} sm={4} md={3} key={index}>
                          <Box
                            sx={{ 
                              position: 'relative',
                              paddingTop: '75%', // 4:3 aspect ratio
                              cursor: 'pointer',
                              border: selectedImageIndex === index ? 2 : 1,
                              borderColor: selectedImageIndex === index ? 'primary.main' : 'divider',
                              borderRadius: 1,
                              overflow: 'hidden',
                              '&:hover': {
                                borderColor: 'primary.main',
                                opacity: 0.9
                              }
                            }}
                            onClick={() => setSelectedImageIndex(index)}
                          >
                            <img 
                              src={
                                url.startsWith('http')
                                  ? url
                                  : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${url}`
                              }
                              alt={`${booking.car?.make} ${booking.car?.model} ${index + 1}`}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                backgroundColor: '#f5f5f5'
                              }}
                              loading="lazy" 
                            />
                            {selectedImageIndex === index && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  py: 0.5,
                                  textAlign: 'center',
                                  fontSize: '0.75rem'
                                }}
                              >
                                Selected
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </>
            ) : (
              <Box 
                sx={{ 
                  height: 400, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                  color: 'text.secondary'
                }}
              >
                <DirectionsCarOutlined sx={{ fontSize: 64, mr: 2 }} />
                <Typography variant="h6">No images available</Typography>
              </Box>
            )}
          </Card>

      {/* Main Content - Single Card with Four Columns */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: theme.shadows[3],
          overflow: 'hidden',
          mb: 3
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: 'stretch',
            minHeight: '400px'
          }}>
            {/* First Column - Car Information */}
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              p: 3
            }}>
                {/* Car Information */}
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DirectionsCarOutlined color="primary" />
                  Car Information
                </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <DirectionsCarOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Vehicle
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  {booking.car?.make} {booking.car?.model} {booking.car?.year}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <LocalGasStationOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Fuel Type
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={600}>
                      {booking.car?.fuelType || booking.car?.fuel || 'Gasoline'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <SettingsOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Transmission
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={600}>
                      {booking.car?.transmission || booking.car?.transmissionType || 'Automatic'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <CategoryOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Body Type
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={600}>
                      {booking.car?.bodyType || 'Sedan'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <AirlineSeatReclineNormalOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Seats
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={600}>
                      {booking.car?.seats || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <LuggageOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Luggage Capacity
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={600}>
                      {booking.car?.luggageCapacity || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* Car Description */}
              {booking.car?.description && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <DescriptionOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Description
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {booking.car.description}
                  </Typography>
                </Box>
              )}
              
              {/* Car Features */}
              {booking.car?.features && booking.car.features.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <FeaturedPlayListOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Features
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {booking.car.features.map((feature, index) => (
                      <Chip
                        key={index}
                        label={feature}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Second Column - Booking Details */}
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              p: 3
            }}>
                {/* Booking Details */}
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventOutlined color="primary" />
                  Booking Details
                </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <CalendarTodayOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Delivery Date & Time
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                  {(() => {
                    const pickupDate = booking.pickupDate || booking.startDate || booking.pickupDateTime;
                    if (!pickupDate) return 'Date not available';
                    const date = new Date(pickupDate);
                    if (isNaN(date.getTime())) return 'Invalid date';
                    return (
                      <>
                        {date.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        <br />
                      
                      </>
                    );
                  })()}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <EventOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Return Date & Time
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                  {(() => {
                    const returnDate = booking.returnDate || booking.endDate || booking.returnDateTime;
                    if (!returnDate) return 'Date not available';
                    const date = new Date(returnDate);
                    if (isNaN(date.getTime())) return 'Invalid date';
                    return (
                      <>
                        {date.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        <br />
                        <Typography component="span" variant="body2" color="text.secondary">
                          {date.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </>
                    );
                  })()}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <MyLocationOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Delivery Location
                  </Typography>
                </Box>
                <Typography 
                  variant="body1" 
                  fontWeight={600} 
                  sx={{ 
                    mb: 2,
                    color: (booking.location || booking.pickupLocation) ? 'primary.main' : 'text.primary',
                    cursor: (booking.location || booking.pickupLocation) ? 'pointer' : 'default',
                    '&:hover': (booking.location || booking.pickupLocation) ? {
                      textDecoration: 'underline'
                    } : {}
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
                      const deliveryLocation = booking.location || booking.pickupLocation;
                      if (deliveryLocation && deliveryLocation !== 'N/A') {
                        const encodedLocation = encodeURIComponent(deliveryLocation);
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
                          '_blank'
                        );
                      }
                    }
                  }}
                >
                  {booking.location || booking.pickupLocation || 'N/A'}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <PlaceOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Return Location
                  </Typography>
                </Box>
                <Typography 
                  variant="body1" 
                  fontWeight={600} 
                  sx={{ 
                    mb: 2,
                    color: booking.returnLocation ? 'primary.main' : 'text.primary',
                    cursor: booking.returnLocation ? 'pointer' : 'default',
                    '&:hover': booking.returnLocation ? {
                      textDecoration: 'underline'
                    } : {}
                  }}
                  onClick={() => {
                    if (booking.car?.geolocation?.latitude && booking.car?.geolocation?.longitude) {
                      // Use precise car coordinates for accurate return location with marker
                      window.open(
                        `https://www.google.com/maps?q=${booking.car.geolocation.latitude},${booking.car.geolocation.longitude}`,
                        '_blank'
                      );
                    } else if (booking.returnLocation) {
                      // Fallback to address search if car coordinates not available
                      const encodedLocation = encodeURIComponent(booking.returnLocation);
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
                        '_blank'
                      );
                    }
                  }}
                >
                  {booking.returnLocation || 'Main Office'}
                </Typography>

              </Box>
            </Box>

            {/* Third Column - Customer Information (Admin Only) */}
            {user?.role === 'admin' && (
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                p: 3
              }}>
                  {/* Customer Information */}
                  <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonOutlined color="primary" />
                    Customer Information
                  </Typography>
                
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <PersonOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                    {booking.user?.name || 
                     (booking.user?.firstName && booking.user?.lastName ? `${booking.user.firstName} ${booking.user.lastName}` : '') ||
                     (booking.user?.profile?.firstName && booking.user?.profile?.lastName ? `${booking.user.profile.firstName} ${booking.user.profile.lastName}` : '') ||
                     'N/A'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <EmailOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                    {booking.user?.email || 'N/A'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <PhoneOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                    {booking.user?.phone || booking.user?.profile?.phone || 'N/A'}
                  </Typography>

                </Box>
              </Box>
            )}

            {/* Fourth Column - Payment Summary */}
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              p: 3
            }}>
                {/* Payment Summary */}
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PaymentOutlined color="primary" />
                  Payment Summary
                </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PesoIcon />
                    <Typography variant="body1" color="text.secondary">
                      Daily Rate
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={600}>
                    ₱{booking.car?.pricePerDay || 0}/day
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body1" color="text.secondary">
                      Duration
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={600}>
                    {totalDays} {totalDays === 1 ? 'day' : 'days'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalculateOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body1" color="text.secondary">
                      Subtotal
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={600}>
                    ₱{(booking.car?.pricePerDay || 0) * totalDays}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Total Amount
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    ₱{booking.totalAmount || (booking.car?.pricePerDay || 0) * totalDays}
                  </Typography>
                </Box>
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PaymentOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Payment Status
                  </Typography>
                </Box>
                <Chip
                  label={
                    booking.status === 'completed' 
                      ? 'Paid' 
                      : (booking.paymentStatus || 'pending').charAt(0).toUpperCase() + (booking.paymentStatus || 'pending').slice(1)
                  }
                  color={
                    booking.status === 'completed' || booking.paymentStatus === 'paid' 
                      ? 'success' 
                      : booking.paymentStatus === 'failed' 
                        ? 'error' 
                        : 'warning'
                  }
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              
              {/* Payment Method */}
              {booking.paymentMethod && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CreditCardOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Payment Method
                    </Typography>
                  </Box>
                  <Chip
                    label={booking.paymentMethod.toUpperCase()}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>




        </Box>
      </Container>
    </Box>

    {/* Image Dialog */}
    <Dialog
      open={imageDialogOpen}
      onClose={() => setImageDialogOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {booking.car?.imageUrls && booking.car.imageUrls.length > 0 && (
          <>
            <img
              src={
                booking.car.imageUrls[selectedImageIndex].startsWith('http')
                  ? booking.car.imageUrls[selectedImageIndex]
                  : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${booking.car.imageUrls[selectedImageIndex]}`
              }
              alt={`${booking.car?.make} ${booking.car?.model}`}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '80vh',
                objectFit: 'contain',
                backgroundColor: '#f5f5f5'
              }}
            />
            <IconButton
              onClick={() => setImageDialogOpen(false)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
              }}
            >
              <Close />
            </IconButton>
            
            {booking.car.imageUrls.length > 1 && (
              <>
                <IconButton
                  onClick={prevImage}
                  sx={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                  }}
                >
                  <ChevronLeft />
                </IconButton>
                
                <IconButton
                  onClick={nextImage}
                  sx={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ModernBookingDetail;

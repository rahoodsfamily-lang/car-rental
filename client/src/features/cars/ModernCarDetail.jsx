import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Chip,
  Button,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Rating,
  Avatar,
  TextField,
  Stack,
  LinearProgress,
  Tooltip,
  alpha,
  Fab,
  Tabs,
  Tab,
  Fade,
  Grow,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CarLocationMap from '../../components/map/CarLocationMap';
import {
  ArrowBack,
  LocalGasStation,
  Settings,
  People,
  Luggage,
  DirectionsCar,
  Palette,
  CalendarToday,
  LocationOn,
  BookOnline,
  Close,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  BuildOutlined,
  HistoryOutlined,
  PriorityHigh,
  // Feature icons
  GpsFixed,
  AcUnit,
  Bluetooth,
  Usb,
  Wifi,
  Videocam,
  WbSunny,
  EventSeat,
  Whatshot,
  Speed,
  VpnKey,
  PlayArrow,
  PhoneIphone,
  Android,
  VolumeUp,
  Radar,
  // Review icons
  Star,
  StarBorder,
  ThumbUp,
  ThumbDown,
  VerifiedUser,
  Person,
  AccessTime
} from '@mui/icons-material';

import ModernBookingModal from '../booking/ModernBookingModal';

import { useToast } from '../../components/feedback/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import axiosInstance from '../../utils/axiosConfig';
import { getImageUrl } from '../../utils/imageHelper';

const ModernCarDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  const { socket } = useSocket();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);


  useEffect(() => {
    fetchCarDetails();
    fetchReviews();
    // Only fetch maintenance history for admin users
    if (user?.role === 'admin') {
      fetchMaintenanceHistory();
    }
  }, [id, user]);

  // Real-time car status updates via WebSocket
  useEffect(() => {
    if (!socket || !car) return;

    const handleCarStatusUpdate = (data) => {
      // Only update if this is the car being viewed
      if (data.carId === car._id) {
        setCar(prevCar => ({
          ...prevCar,
          availability: data.availability
        }));
      }
    };

    socket.on('carStatusUpdated', handleCarStatusUpdate);

    return () => {
      socket.off('carStatusUpdated', handleCarStatusUpdate);
    };
  }, [socket, car]);

  const fetchCarDetails = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/cars/${id}`);
      setCar(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      showError('Failed to load car details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await axiosInstance.get(`/api/reviews/cars/${id}?limit=5&sortBy=createdAt&order=desc`);
      
      const data = response.data;
      setReviews(data.reviews || []);
      setReviewStats(data.stats || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    } catch (err) {
      console.error('Error fetching reviews:', err);
      // Don't show error toast for reviews as it's not critical
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchMaintenanceHistory = async () => {
    try {
      setMaintenanceLoading(true);
      // Use the new public endpoint for car maintenance history
      const response = await axiosInstance.get(`/api/cars/${id}/maintenance?limit=10`);
      setMaintenanceHistory(response.data.maintenanceRecords || []);
    } catch (err) {
      console.error('Error fetching maintenance history:', err);
      // Don't show error toast for maintenance as it's not critical
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleBookingSuccess = (bookingData) => {
    // Navigate to payment page after showing success message
    setTimeout(() => {
      navigate(`/payment/${bookingData._id}`);
    }, 2000);
  };

  const getAvailabilityColor = (availability) => {
    // Check maintenance status first
    if (car.maintenanceStatus === 'in_progress' || availability?.toLowerCase() === 'maintenance') {
      return 'error';
    } else if (car.maintenanceStatus === 'scheduled') {
      return 'warning';
    } else if (availability?.toLowerCase() === 'available') {
      return 'success';
    } else if (availability?.toLowerCase() === 'rented') {
      return 'warning';
    }
    return 'error';
  };

  const getAvailabilityText = () => {
    // Check maintenance status first
    if (car.maintenanceStatus === 'in_progress' || car.availability?.toLowerCase() === 'maintenance') {
      return 'In Maintenance';
    } else if (car.maintenanceStatus === 'scheduled') {
      return 'Maintenance Scheduled';
    } else if (car.availability?.toLowerCase() === 'available') {
      return 'Available Now';
    } else if (car.availability?.toLowerCase() === 'rented') {
      return 'Currently Rented';
    } else if (car.availableFrom) {
      return `Available ${new Date(car.availableFrom).toLocaleDateString()}`;
    }
    return 'Unavailable';
  };

  const nextImage = () => {
    if (car?.imageUrls && car.imageUrls.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === car.imageUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (car?.imageUrls && car.imageUrls.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? car.imageUrls.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ mb: 3 }} />
        <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 2 }} />
        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
          <Grid xs={12} md={4}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error || !car) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Car not found'}
        </Alert>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/cars')}
          variant="outlined"
        >
          Back to Cars
        </Button>
      </Box>
    );
  }

  const specifications = [
    { icon: <LocalGasStation />, label: 'Fuel Type', value: car.fuelType },
    { icon: <Settings />, label: 'Transmission', value: car.transmission },
    { icon: <People />, label: 'Seats', value: car.seats },
    { icon: <Luggage />, label: 'Luggage Capacity', value: car.luggageCapacity ? `${car.luggageCapacity} Bags` : null },
    { icon: <DirectionsCar />, label: 'Body Type', value: car.bodyType },
    { icon: <Palette />, label: 'Exterior Color', value: car.exteriorColor },
    { icon: <Palette />, label: 'Interior Color', value: car.interiorColor }
  ].filter(spec => spec.value);

  // Feature icon mapping
  const getFeatureIcon = (feature) => {
    const iconMap = {
      'GPS': <GpsFixed />,
      'AC': <AcUnit />,
      'Bluetooth': <Bluetooth />,
      'USB': <Usb />,
      'WiFi': <Wifi />,
      'Backup Camera': <Videocam />,
      'Sunroof': <WbSunny />,
      'Leather Seats': <EventSeat />,
      'Heated Seats': <Whatshot />,
      'Cruise Control': <Speed />,
      'Keyless Entry': <VpnKey />,
      'Push Start': <PlayArrow />,
      'Apple CarPlay': <PhoneIphone />,
      'Android Auto': <Android />,
      'Premium Sound': <VolumeUp />,
      'Parking Sensors': <Radar />
    };
    return iconMap[feature] || <DirectionsCar />;
  };

  // Review helper functions
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => {
      return index < rating ? (
        <Star key={index} sx={{ color: '#ffc107', fontSize: 16 }} />
      ) : (
        <StarBorder key={index} sx={{ color: '#e0e0e0', fontSize: 16 }} />
      );
    });
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'success.main';
    if (rating >= 3.5) return 'warning.main';
    if (rating >= 2.5) return 'orange';
    return 'error.main';
  };

  // Loading skeleton
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        {/* Header Skeleton */}
        <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={400} height={40} />
              <Box sx={{ flexGrow: 1 }} />
              <Skeleton variant="rounded" width={100} height={32} />
            </Box>
            <Box sx={{ display: 'flex', gap: 3, ml: 7 }}>
              <Skeleton variant="text" width={120} height={30} />
              <Skeleton variant="text" width={150} height={24} />
              <Skeleton variant="text" width={180} height={24} />
            </Box>
          </Box>
        </Box>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Image Gallery Skeleton */}
            <Card>
              <Skeleton variant="rectangular" height={500} />
              <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} variant="rectangular" width={80} height={60} />
                ))}
              </Box>
            </Card>

            {/* Tabs Skeleton */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Skeleton variant="rectangular" width={400} height={48} />
            </Box>

            {/* Content Skeleton */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card sx={{ p: 3 }}>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Box sx={{ mt: 2 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} variant="text" width="100%" height={24} sx={{ mb: 1 }} />
                    ))}
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 3 }}>
                  <Skeleton variant="text" width="80%" height={32} />
                  <Box sx={{ mt: 2 }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="text" width="100%" height={24} sx={{ mb: 1 }} />
                    ))}
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Fade in={!loading} timeout={600}>
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'grey.50', 
        width: '100vw',
        maxWidth: '100%',
        overflowX: 'hidden',
        position: 'relative'
      }}>
      {/* Header - Responsive */}
      <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider', width: '100%', overflowX: 'hidden' }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 3 }, width: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: 2 }}>
            <IconButton 
              onClick={() => {
                // Check if we came from favorites page
                if (location.state?.from === 'favorites') {
                  navigate('/favorites');
                } else if (user?.role === 'admin') {
                  navigate('/admin/fleet');
                } else {
                  // Default to browse cars page
                  navigate('/cars');
                }
              }} 
              sx={{ mr: { xs: 0, sm: 1 } }}
            >
              <ArrowBack />
            </IconButton>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                flexGrow: 1,
                fontSize: { xs: '1rem', sm: '1.75rem', md: '2.125rem' },
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: { xs: 'nowrap', sm: 'normal' },
                maxWidth: { xs: 'calc(100% - 60px)', sm: '100%' }
              }}
            >
              {`${car.year} ${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ''}`}
            </Typography>
            <Chip 
              label={getAvailabilityText()}
              color={getAvailabilityColor(car.availability)}
              variant="filled"
              size="small"
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            />
          </Box>
          
          {/* Mobile availability chip */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, mb: 1, ml: 0 }}>
            <Chip 
              label={getAvailabilityText()}
              color={getAvailabilityColor(car.availability)}
              variant="filled"
              size="small"
            />
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1.5, sm: 3 }, 
            flexWrap: 'wrap', 
            ml: { xs: 0, sm: 7 } 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="h6" 
                color="primary.main"
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
              >
                ₱{car.pricePerDay}/day
              </Typography>
            </Box>
            
            {car.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn color="action" sx={{ fontSize: { xs: 18, sm: 24 } }} />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  {car.location}
                </Typography>
              </Box>
            )}
            
            {car.availableFrom && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday color="action" sx={{ fontSize: { xs: 18, sm: 24 } }} />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  Available from {new Date(car.availableFrom).toLocaleDateString()}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ 
        width: '100%',
        maxWidth: { sm: 1200, xl: 1536 }, 
        mx: 'auto',
        py: { xs: 1, sm: 3, md: 4 }, 
        px: { xs: 1, sm: 3 },
        boxSizing: 'border-box'
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 }, width: '100%' }}>
          {/* Image Gallery */}
          <Grow in={!loading} timeout={800}>
            <Card sx={{ 
              width: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}>
              {car.imageUrls && car.imageUrls.length > 0 ? (
                <>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      image={getImageUrl(car.imageUrls[selectedImageIndex])}
                      alt={`${car.make} ${car.model}`}
                      sx={{ 
                        height: { xs: '250px', sm: '400px', md: '500px' },
                        width: '100%',
                        objectFit: 'cover',
                        bgcolor: '#f5f5f5'
                      }}
                    />
                    
                    {car.imageUrls.length > 1 && (
                      <>
                        <IconButton
                          sx={{
                            position: 'absolute',
                            left: { xs: 8, sm: 16 },
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                            width: { xs: 36, sm: 40 },
                            height: { xs: 36, sm: 40 }
                          }}
                          onClick={prevImage}
                        >
                          <ChevronLeft sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        </IconButton>
                        
                        <IconButton
                          sx={{
                            position: 'absolute',
                            right: { xs: 8, sm: 16 },
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                            width: { xs: 36, sm: 40 },
                            height: { xs: 36, sm: 40 }
                          }}
                          onClick={nextImage}
                        >
                          <ChevronRight sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        </IconButton>
                      </>
                    )}
                  </Box>
                  
                  {car.imageUrls.length > 1 && (
                    <Box sx={{ p: { xs: 1, sm: 2 } }}>
                      <Grid container spacing={1}>
                        {car.imageUrls.map((url, index) => (
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
                                src={getImageUrl(url)}
                                alt={`${car.make} ${car.model} ${index + 1}`}
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
                  <DirectionsCar sx={{ fontSize: 64, mr: 2 }} />
                  <Typography variant="h6">No images available</Typography>
                </Box>
              )}
            </Card>
          </Grow>

          {/* Tabbed Content Section */}
          <Grow in={!loading} timeout={1000}>
            <Card sx={{ 
              width: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                aria-label="car details tabs"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    minHeight: { xs: 42, sm: 48 },
                    minWidth: { xs: 'auto', sm: 120 },
                    px: { xs: 1.5, sm: 2 },
                  },
                }}
              >
                <Tab 
                  label="Specifications" 
                  icon={<Settings sx={{ fontSize: 20, mr: 0.5 }} />}
                  iconPosition="start"
                />
                <Tab 
                  label="Features" 
                  icon={<CheckCircle sx={{ fontSize: 20, mr: 0.5 }} />}
                  iconPosition="start"
                  disabled={!car.features || car.features.length === 0}
                />
                <Tab 
                  label="Location"
                  icon={<LocationOn sx={{ fontSize: 20, mr: 0.5 }} />}
                  iconPosition="start"
                />
                <Tab 
                  label={`Reviews ${reviewStats.totalReviews > 0 ? `(${reviewStats.totalReviews})` : ''}`}
                  icon={<Star sx={{ fontSize: 20, mr: 0.5, color: '#ffc107' }} />}
                  iconPosition="start"
                />
                {user?.role === 'admin' && (
                  <Tab 
                    label="Maintenance History" 
                    icon={<BuildOutlined sx={{ fontSize: 20, mr: 0.5 }} />}
                    iconPosition="start"
                  />
                )}
              </Tabs>
            </Box>
            
            <CardContent sx={{ 
              minHeight: { xs: 300, sm: 400 }, 
              p: { xs: 1, sm: 3 },
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}>
              {/* Specifications Tab */}
              {activeTab === 0 && (
                <Box sx={{ 
                  width: '100%', 
                  maxWidth: '100%',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      mb: { xs: 2, sm: 3 },
                      fontSize: { xs: '1.125rem', sm: '1.25rem' },
                      px: { xs: 0.5, sm: 0 }
                    }}
                  >
                    Vehicle Specifications
                  </Typography>
                  
                  <Grid container spacing={{ xs: 1, sm: 3 }}>
                    {specifications.map((spec, index) => (
                      <Grid item xs={6} sm={6} md={4} key={index}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'center', sm: 'center' },
                          textAlign: { xs: 'center', sm: 'left' },
                          gap: { xs: 0.75, sm: 2 },
                          p: { xs: 1, sm: 2 },
                          borderRadius: { xs: 2, sm: 3 },
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          height: '100%',
                          '&:hover': {
                            bgcolor: 'primary.light',
                            borderColor: 'primary.main',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transform: 'translateY(-2px)',
                            transition: 'all 0.3s ease'
                          }
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: { xs: 40, sm: 48 },
                            height: { xs: 40, sm: 48 },
                            minWidth: { xs: 40, sm: 48 },
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            color: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            '& svg': {
                              fontSize: { xs: 20, sm: 24 }
                            }
                          }}>
                            {spec.icon}
                          </Box>
                          <Box sx={{ minWidth: 0, width: '100%' }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                fontSize: { xs: '0.65rem', sm: '0.875rem' },
                                mb: 0.25
                              }}
                            >
                              {spec.label}
                            </Typography>
                            <Typography 
                              variant="body1" 
                              fontWeight="medium"
                              sx={{ 
                                fontSize: { xs: '0.8rem', sm: '1rem' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {spec.value}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              
              {/* Features Tab */}
              {activeTab === 1 && car.features && car.features.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    Available Features
                  </Typography>
                  
                  <Grid container spacing={{ xs: 2, sm: 3 }}>
                    {car.features.map((feature, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: { xs: 1.5, sm: 2.5 },
                          p: { xs: 1.5, sm: 2.5 },
                          borderRadius: { xs: 2, sm: 3 },
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          '&:hover': {
                            bgcolor: 'primary.light',
                            borderColor: 'primary.main',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transform: 'translateY(-2px)',
                            transition: 'all 0.3s ease'
                          }
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: { xs: 40, sm: 48 },
                            height: { xs: 40, sm: 48 },
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            color: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            '& svg': {
                              fontSize: { xs: 20, sm: 24 }
                            }
                          }}>
                            {getFeatureIcon(feature)}
                          </Box>
                          <Box>
                            <Typography 
                              variant="body1" 
                              fontWeight="medium"
                              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                            >
                              {feature}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              
              {/* Location Tab - Responsive */}
              {activeTab === 2 && (
                <Box>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      mb: { xs: 2, sm: 3 },
                      fontSize: { xs: '1.125rem', sm: '1.25rem' }
                    }}
                  >
                    Car Location
                  </Typography>
                  
                  <CarLocationMap
                    latitude={car.geolocation?.latitude}
                    longitude={car.geolocation?.longitude}
                    address={car.geolocation?.address || car.location}
                    carName={`${car.make} ${car.model}`}
                    height="450px"
                  />
                  
                  {car.location && (
                    <Box sx={{ 
                      mt: { xs: 2, sm: 3 }, 
                      p: { xs: 1.5, sm: 2 }, 
                      bgcolor: 'grey.50', 
                      borderRadius: 2 
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOn sx={{ 
                          color: 'primary.main',
                          fontSize: { xs: 20, sm: 24 }
                        }} />
                        <Typography 
                          variant="subtitle1" 
                          fontWeight={600}
                          sx={{ fontSize: { xs: '0.9375rem', sm: '1rem' } }}
                        >
                          Delivery Location
                        </Typography>
                      </Box>
                      <Typography 
                        variant="body1" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                      >
                        {car.geolocation?.address || car.location}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Reviews Tab */}
              {activeTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    Customer Reviews
                    {reviewStats.totalReviews > 0 && (
                      <Chip 
                        label={`${reviewStats.averageRating.toFixed(1)} ★`}
                        size="small"
                        sx={{ bgcolor: '#ffc107', color: 'white' }}
                      />
                    )}
                  </Typography>
                
                {reviewsLoading ? (
                  <Box sx={{ py: 3 }}>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Box key={index} sx={{ mb: 3 }}>
                        <Skeleton variant="text" width="60%" height={30} />
                        <Skeleton variant="text" width="100%" height={20} />
                        <Skeleton variant="text" width="80%" height={20} />
                      </Box>
                    ))}
                  </Box>
                ) : reviewStats.totalReviews > 0 ? (
                  <>
                    {/* Review Summary - Responsive */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'stretch', sm: 'center' }, 
                      gap: { xs: 2, sm: 3 }, 
                      mb: 3, 
                      p: { xs: 1.5, sm: 2 }, 
                      bgcolor: 'grey.50', 
                      borderRadius: 2 
                    }}>
                      <Box sx={{ textAlign: 'center', minWidth: { xs: 'auto', sm: 120 } }}>
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            color: getRatingColor(reviewStats.averageRating), 
                            fontWeight: 'bold',
                            fontSize: { xs: '2rem', sm: '3rem' }
                          }}
                        >
                          {reviewStats.averageRating.toFixed(1)}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                          {renderStars(Math.round(reviewStats.averageRating))}
                        </Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        >
                          {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" sx={{ minWidth: 20 }}>
                              {rating}
                            </Typography>
                            <Star sx={{ color: '#ffc107', fontSize: 16 }} />
                            <Box 
                              sx={{ 
                                flexGrow: 1, 
                                height: 8, 
                                bgcolor: 'grey.200', 
                                borderRadius: 4,
                                overflow: 'hidden'
                              }}
                            >
                              <Box 
                                sx={{ 
                                  height: '100%', 
                                  bgcolor: '#ffc107',
                                  width: `${(reviewStats.ratingDistribution[rating] / reviewStats.totalReviews) * 100}%`,
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </Box>
                            <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'right' }}>
                              {reviewStats.ratingDistribution[rating]}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Individual Reviews */}
                    <Divider sx={{ mb: 3 }} />
                    <Typography variant="h6" gutterBottom>
                      Recent Reviews
                    </Typography>
                    
                    {reviews.map((review, index) => (
                      <Box key={review._id} sx={{ mb: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, borderBottom: index < reviews.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 } }}>
                          <Avatar
                            src={getImageUrl(review.userId?.profile?.profilePicture)}
                            sx={{ 
                              width: { xs: 40, sm: 48 }, 
                              height: { xs: 40, sm: 48 },
                              bgcolor: review.userId?.profile?.profilePicture ? 'transparent' : 'primary.main',
                              fontSize: { xs: '1rem', sm: '1.25rem' },
                              fontWeight: 'bold'
                            }}
                          >
                            {review.userId?.profile?.firstName && review.userId?.profile?.lastName
                              ? `${review.userId.profile.firstName.charAt(0)}${review.userId.profile.lastName.charAt(0)}`.toUpperCase()
                              : review.userId?.firstName?.charAt(0)?.toUpperCase() || review.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </Avatar>
                          
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: { xs: 'column', sm: 'row' },
                              alignItems: { xs: 'flex-start', sm: 'center' }, 
                              gap: { xs: 0.5, sm: 2 }, 
                              mb: 1 
                            }}>
                              <Typography 
                                variant="subtitle2" 
                                fontWeight="bold"
                                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                              >
                                {review.userId?.profile?.firstName && review.userId?.profile?.lastName
                                  ? `${review.userId.profile.firstName} ${review.userId.profile.lastName}`
                                  : review.userId?.firstName && review.userId?.lastName
                                    ? `${review.userId.firstName} ${review.userId.lastName}`
                                    : review.userId?.name || 'Anonymous'}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                {review.verified && (
                                  <Chip 
                                    icon={<VerifiedUser />} 
                                    label="Verified Renter" 
                                    size="small" 
                                    color="success" 
                                    variant="outlined"
                                  />
                                )}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary"
                                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                  >
                                    {formatDate(review.createdAt)}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Box sx={{ display: 'flex' }}>
                                {renderStars(review.rating)}
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                ({review.rating}/5)
                              </Typography>
                            </Box>
                            
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                              {review.title}
                            </Typography>
                            
                            <Typography variant="body2" color="text.primary" paragraph>
                              {review.comment}
                            </Typography>
                            
                            {/* Pros and Cons */}
                            {(review.pros?.length > 0 || review.cons?.length > 0) && (
                              <Box sx={{ mt: 2 }}>
                                {review.pros?.length > 0 && (
                                  <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="success.main" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <ThumbUp sx={{ fontSize: 14 }} />
                                      Pros:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {review.pros.map((pro, idx) => (
                                        <Chip key={idx} label={pro} size="small" color="success" variant="outlined" />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                                
                                {review.cons?.length > 0 && (
                                  <Box>
                                    <Typography variant="body2" color="error.main" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <ThumbDown sx={{ fontSize: 14 }} />
                                      Cons:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {review.cons.map((con, idx) => (
                                        <Chip key={idx} label={con} size="small" color="error" variant="outlined" />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            )}
                            
                            {/* Helpful votes */}
                            {review.helpfulVotes > 0 && (
                              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ThumbUp sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                  {review.helpfulVotes} people found this helpful
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                    
                    {reviewStats.totalReviews > reviews.length && (
                      <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Showing {reviews.length} of {reviewStats.totalReviews} reviews
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Star sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Reviews Yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Be the first to review this car after your rental
                    </Typography>
                  </Box>
                )}
                </Box>
              )}

              {/* Maintenance History Tab - Admin Only */}
              {activeTab === 4 && user?.role === 'admin' && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    Maintenance History
                  </Typography>
                  
                  {maintenanceLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <Typography>Loading maintenance history...</Typography>
                    </Box>
                  ) : maintenanceHistory.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {maintenanceHistory.map((record) => (
                        <Card 
                          key={record._id} 
                          elevation={1}
                          sx={{ 
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              elevation: 3,
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: { xs: 'column', sm: 'row' },
                              justifyContent: 'space-between', 
                              alignItems: { xs: 'flex-start', sm: 'start' }, 
                              gap: { xs: 1.5, sm: 0 },
                              mb: 2 
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
                                <Box 
                                  sx={{ 
                                    width: { xs: 40, sm: 48 }, 
                                    height: { xs: 40, sm: 48 }, 
                                    borderRadius: 2,
                                    bgcolor: (theme) => 
                                      record.status === 'completed' ? alpha(theme.palette.success.main, 0.1) :
                                      record.status === 'in_progress' ? alpha(theme.palette.warning.main, 0.1) :
                                      record.status === 'scheduled' ? alpha(theme.palette.info.main, 0.1) : 
                                      alpha(theme.palette.grey[500], 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <BuildOutlined 
                                    sx={{ 
                                      fontSize: { xs: 20, sm: 24 },
                                      color: record.status === 'completed' ? 'success.main' :
                                             record.status === 'in_progress' ? 'warning.main' :
                                             record.status === 'scheduled' ? 'info.main' : 'text.secondary'
                                    }} 
                                  />
                                </Box>
                                <Box>
                                  <Typography 
                                    variant="h6" 
                                    sx={{ 
                                      fontWeight: 600, 
                                      mb: 0.5, 
                                      color: 'text.primary',
                                      fontSize: { xs: '1rem', sm: '1.25rem' }
                                    }}
                                  >
                                    {record.type}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarToday sx={{ fontSize: { xs: 12, sm: 14 }, color: 'text.secondary' }} />
                                    <Typography 
                                      variant="body2" 
                                      color="text.secondary"
                                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                    >
                                      Scheduled: {new Date(record.scheduledDate).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                              <Chip 
                                label={record.status.replace('_', ' ').charAt(0).toUpperCase() + record.status.replace('_', ' ').slice(1)} 
                                size="small"
                                color={
                                  record.status === 'completed' ? 'success' :
                                  record.status === 'in_progress' ? 'warning' :
                                  record.status === 'scheduled' ? 'info' : 'default'
                                }
                                sx={{ fontWeight: 500 }}
                              />
                            </Box>
                            
                            {record.description && (
                              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.6 }}>
                                {record.description}
                              </Typography>
                            )}
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PriorityHigh sx={{ 
                                  fontSize: 18, 
                                  color: record.priority === 'high' ? 'error.main' :
                                         record.priority === 'medium' ? 'warning.main' : 'success.main'
                                }} />
                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                  Priority:
                                </Typography>
                                <Chip 
                                  label={record.priority.charAt(0).toUpperCase() + record.priority.slice(1)} 
                                  size="small"
                                  color={
                                    record.priority === 'high' ? 'error' :
                                    record.priority === 'medium' ? 'warning' : 'success'
                                  }
                                  sx={{ fontWeight: 500 }}
                                />
                              </Box>
                              
                              {(record.estimatedCost || record.actualCost) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box 
                                    sx={{ 
                                      width: 18, 
                                      height: 18, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      color: 'primary.main',
                                      fontWeight: 'bold',
                                      fontSize: 16
                                    }}
                                  >
                                    ₱
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                    Cost:
                                  </Typography>
                                  {record.actualCost ? (
                                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                      ₱{record.actualCost.toLocaleString()}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      Est. ₱{record.estimatedCost?.toLocaleString()}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                              
                              {record.completedDate && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                    Completed:
                                  </Typography>
                                  <Typography variant="body2" color="success.dark">
                                    {new Date(record.completedDate).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <HistoryOutlined sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Maintenance History
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This vehicle has no recorded maintenance
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Booking Section - Hidden for admin users */}
              {user?.role !== 'admin' && (
                <>
                  <Divider sx={{ my: { xs: 2, sm: 3 } }} />
                  <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 2, sm: 0 } }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                    >
                      Ready to Book?
                    </Typography>

                    <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                      <Typography 
                        variant="h4" 
                        color="primary.main" 
                        gutterBottom
                        sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
                      >
                        ₱{car.pricePerDay}
                        <Typography component="span" variant="body2" color="text.secondary">
                          /day
                        </Typography>
                      </Typography>
                    </Box>

                    {car.availability === 'available' ? (
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<BookOnline />}
                        onClick={() => setBookingDialogOpen(true)}
                        sx={{ 
                          mb: 2, 
                          px: { xs: 2, sm: 4 },
                          width: { xs: 'auto', sm: 'auto' },
                          minWidth: { xs: 120, sm: 150 }
                        }}
                      >
                        {isMobile ? 'Book' : 'Book Now'}
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        size="large"
                        disabled
                        sx={{ 
                          mb: 2,
                          width: { xs: '100%', sm: 'auto' },
                          maxWidth: { xs: 300, sm: 'none' }
                        }}
                      >
                        Currently Unavailable
                      </Button>
                    )}

                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      align="center"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      Free cancellation up to 24 hours before delivery
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
          </Grow>
        </Box>
      </Box>

      {/* Booking Modal */}
      {car && (
        <ModernBookingModal
          open={bookingDialogOpen}
          onClose={() => setBookingDialogOpen(false)}
          car={car}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Image Gallery Dialog - Responsive */}
      <Dialog 
        open={imageDialogOpen} 
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
        fullScreen={false}
        PaperProps={{
          sx: {
            m: { xs: 1, sm: 2 },
            maxHeight: { xs: '95vh', sm: '90vh' }
          }
        }}
      >
        <DialogActions>
          <IconButton onClick={() => setImageDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogActions>
        <DialogContent sx={{ p: 0 }}>
          {car.imageUrls && car.imageUrls.length > 0 && (
            <Box sx={{ position: 'relative' }}>
              <img 
                src={getImageUrl(car.imageUrls[selectedImageIndex])}
                alt={`${car.make} ${car.model}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              
              {car.imageUrls.length > 1 && (
                <>
                  <Fab
                    size="small"
                    sx={{
                      position: 'absolute',
                      left: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                    onClick={prevImage}
                  >
                    <ChevronLeft />
                  </Fab>
                  
                  <Fab
                    size="small"
                    sx={{
                      position: 'absolute',
                      right: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                    onClick={nextImage}
                  >
                    <ChevronRight />
                  </Fab>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
      </Box>
    </Fade>
  );
};

export default ModernCarDetail;
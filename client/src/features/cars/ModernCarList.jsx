import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  TextField,
  MenuItem,
  Button,
  Chip,
  Pagination,
  InputAdornment,
  IconButton,
  Skeleton,
  useTheme,
  useMediaQuery,
  alpha,
  Zoom,
  Collapse,
} from '@mui/material';
import {
  SearchOutlined,
  FilterListOutlined,
  SortOutlined,
  RefreshOutlined,
  DirectionsCarOutlined,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  TuneOutlined,
} from '@mui/icons-material';
import axiosInstance from '../../utils/axiosConfig';
import ModernCarCard from '../../components/ModernCarCard';
import ModernTextField from '../../components/forms/ModernTextField';
import { useToast } from '../../components/feedback/ToastProvider';
import ModernBookingModal from '../booking/ModernBookingModal';
import { PageLoader, CardSkeleton } from '../../components/feedback/LoadingSpinner';
import { PageError, InlineError } from '../../components/feedback/ErrorDisplay';
import { useAuth } from '../auth/AuthContext';
import { useFavorites } from '../favorites/FavoritesContext';
import { useSocket } from '../../contexts/SocketContext';
import { Alert, AlertTitle } from '@mui/material';
import { useNavigate } from 'react-router-dom';


const ModernCarList = () => {
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { socket } = useSocket();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingCar, setBookingCar] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    make: '',
    model: '',
    year: '',
    availability: '',
    location: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1,
  });
  const [hasLocation, setHasLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchCars();
  }, [filters, pagination.page, activeSearchTerm]);

  // Fetch user location status
  useEffect(() => {
    const fetchLocationStatus = async () => {
      if (!user) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axiosInstance.get('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const userProfile = response.data.user?.profile || response.data.profile;
        setHasLocation(!!userProfile?.address?.trim());
      } catch (err) {
        console.error('Failed to fetch location status:', err);
      }
    };
    
    if (user) {
      fetchLocationStatus();
    }
    
    // Refetch when user returns to the page (e.g., from profile)
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchLocationStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Debounced search - updates 500ms after user stops typing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setActiveSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Real-time car status updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleCarStatusUpdate = (data) => {
      setCars(prevCars => 
        prevCars.map(car => 
          car._id === data.carId 
            ? { ...car, availability: data.availability }
            : car
        )
      );
    };

    socket.on('carStatusUpdated', handleCarStatusUpdate);

    return () => {
      socket.off('carStatusUpdated', handleCarStatusUpdate);
    };
  }, [socket]);

  const fetchCars = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...filters,
        search: activeSearchTerm,
        page: pagination.page,
        limit: pagination.limit,
      }).toString();
      
      const response = await axiosInstance.get(`/api/cars?${queryParams}`);
      setCars(response.data.cars);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages,
      }));
      setError(null);
    } catch (err) {
      setError('Failed to fetch cars. Please try again.');
      toast.error('Failed to load cars');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (event, value) => {
    setPagination(prev => ({ ...prev, page: value }));
    // Stay at pagination controls, don't scroll to top
  };

  const handleBookNow = (car) => {
    setBookingCar(car);
    setShowBookingModal(true);
  };

  const handleBookingSuccess = (booking) => {
    setShowBookingModal(false);
    setBookingCar(null);
    // Navigate to payment page
    setTimeout(() => {
      navigate(`/payment/${booking._id}`);
    }, 1500);
  };

  const handleFavorite = async (carId) => {
    if (!user) {
      toast.error('Please login to add favorites');
      return;
    }
    await toggleFavorite(carId);
  };

  const handleSearchSubmit = () => {
    setActiveSearchTerm(searchTerm);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };
// vercel-rebuild-hash: 001

  const clearFilters = () => {
    setFilters({
      make: '',
      model: '',
      year: '',
      availability: '',
      location: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setSearchTerm('');
    setActiveSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => 
    value && key !== 'sortBy' && key !== 'sortOrder'
  ).length + (activeSearchTerm ? 1 : 0);

  if (loading && cars.length === 0) {
    return <PageLoader message="Loading available cars..." />;
  }

  if (error && cars.length === 0) {
    return (
      <PageError
        title="Unable to load cars"
        message={error}
        onRetry={fetchCars}
      />
    );
  }

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
        // Remove autofill background color
        '& input:-webkit-autofill': {
          WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
          WebkitTextFillColor: 'inherit !important',
          transition: 'background-color 5000s ease-in-out 0s',
        },
        '& input:-webkit-autofill:hover': {
          WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
          WebkitTextFillColor: 'inherit !important',
        },
        '& input:-webkit-autofill:focus': {
          WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
          WebkitTextFillColor: 'inherit !important',
        },
        '& input:-webkit-autofill:active': {
          WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
          WebkitTextFillColor: 'inherit !important',
        },
      }}
    >
      {/* Location Banner for Users Without Location */}
      {user && hasLocation !== null && !hasLocation && (
        <Zoom in={true} style={{ transitionDelay: '200ms' }}>
          <Alert 
            severity="info" 
            sx={{ 
              mb: { xs: 2, sm: 2.5, md: 3 },
              borderRadius: { xs: 1.5, sm: 2 },
              padding: { xs: '10px 12px', sm: '16px', md: '16px' },
              '& .MuiAlert-message': {
                width: '100%',
                py: { xs: 0, sm: 0.5 }
              },
              '& .MuiAlert-action': {
                pt: { xs: 0, sm: 0.5 },
                pl: { xs: 1, sm: 2 },
                alignItems: { xs: 'flex-start', sm: 'center' }
              }
            }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => navigate('/profile')}
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '0.7rem', sm: '0.8125rem', md: '0.875rem' },
                  padding: { xs: '4px 8px', sm: '6px 16px', md: '6px 16px' },
                  whiteSpace: 'nowrap',
                  minWidth: { xs: 'auto', sm: 'auto' }
                }}
              >
                Set Location
              </Button>
            }
          >
            <AlertTitle sx={{ 
              fontWeight: 600,
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1rem' },
              mb: { xs: 0.5, sm: 1 }
            }}>
              {isMobile ? 'Location Required' : 'Location Required for Booking'}
            </AlertTitle>
            <Typography 
              variant="body2"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' },
                lineHeight: { xs: 1.4, sm: 1.5 }
              }}
            >
              {isMobile 
                ? 'Set your location to book vehicles.'
                : 'Please set your location in your profile before booking a car. This helps us serve you better.'}
            </Typography>
          </Alert>
        </Zoom>
      )}

      {/* Header */}
      <Box sx={{ mb: { xs: 3, sm: 3.5, md: 4 } }}>
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
          <DirectionsCarOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
          Browse Our Fleet
        </Typography>
        
        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            mb: { xs: 2, sm: 2.5, md: 3 },
            lineHeight: 1.6,
          }}
        >
          Discover the perfect car for your journey from our premium collection
        </Typography>

        {/* Search and Filters */}
        <Box
          sx={{
            mb: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 0 },
            borderBottom: { xs: 1, sm: 0 },
            borderBottomColor: { xs: 'divider', sm: 'transparent' },
          }}
        >
          {/* Search Bar and Filters - Inline on Desktop */}
          <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, mb: { xs: 1.5, sm: 0 }, flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                placeholder={isMobile ? "Search cars..." : "Search cars by make, model, or location..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setActiveSearchTerm(searchTerm);
                  }
                }}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearchTerm('');
                          setActiveSearchTerm('');
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& input:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: 'inherit',
                  },
                  '& input:-webkit-autofill:hover': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: 'inherit',
                  },
                  '& input:-webkit-autofill:focus': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: 'inherit',
                  },
                  '& input:-webkit-autofill:active': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: 'inherit',
                  },
                }}
              />
            </Box>

            {/* Mobile: Filters Toggle Button */}
            <Button
              variant="outlined"
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                display: { xs: 'flex', sm: 'none' },
                minWidth: 'auto',
                px: 2,
                borderRadius: 2,
                borderColor: showFilters ? 'primary.main' : 'divider',
                bgcolor: showFilters ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              }}
            >
              <TuneOutlined sx={{ fontSize: 20 }} />
              {activeFiltersCount > 0 && (
                <Chip
                  label={activeFiltersCount}
                  size="small"
                  color="primary"
                  sx={{
                    ml: 0.5,
                    height: 20,
                    minWidth: 20,
                    '& .MuiChip-label': {
                      px: 0.5,
                      fontSize: '0.7rem',
                    },
                  }}
                />
              )}
            </Button>

            {/* Desktop/Tablet: Filters Inline */}
            <TextField
              select
              label="Availability"
              value={filters.availability}
              onChange={(e) => handleFilterChange('availability', e.target.value)}
              size="small"
              sx={{ 
                display: { xs: 'none', sm: 'block' }, 
                width: 'auto',
                minWidth: 'fit-content',
                '& .MuiSelect-select': {
                  paddingRight: '32px !important',
                }
              }}
              SelectProps={{
                displayEmpty: true,
                autoWidth: true,
              }}
              InputLabelProps={{
                shrink: true,
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="rented">Rented</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
            </TextField>

            <TextField
              select
              label="Sort By"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              size="small"
              sx={{ 
                display: { xs: 'none', sm: 'block' }, 
                width: 'auto',
                minWidth: 'fit-content',
                '& .MuiSelect-select': {
                  paddingRight: '32px !important',
                }
              }}
              SelectProps={{
                autoWidth: true,
              }}
              InputLabelProps={{
                shrink: true,
              }}
            >
              <MenuItem value="createdAt">Newest</MenuItem>
              <MenuItem value="pricePerDay">Price</MenuItem>
              <MenuItem value="make">Make</MenuItem>
              <MenuItem value="year">Year</MenuItem>
            </TextField>

            <TextField
              select
              label="Order"
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              size="small"
              sx={{ 
                display: { xs: 'none', sm: 'block' }, 
                width: 'auto',
                minWidth: 'fit-content',
                '& .MuiSelect-select': {
                  paddingRight: '32px !important',
                }
              }}
              SelectProps={{
                autoWidth: true,
              }}
              InputLabelProps={{
                shrink: true,
              }}
            >
              <MenuItem value="desc">Descending</MenuItem>
              <MenuItem value="asc">Ascending</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              onClick={fetchCars}
              startIcon={<RefreshOutlined />}
              size="small"
              disabled={loading}
              sx={{ display: { xs: 'none', sm: 'flex' }, height: '40px' }}
            >
              Refresh
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="outlined"
                onClick={clearFilters}
                size="small"
                color="secondary"
                sx={{ display: { xs: 'none', sm: 'flex' }, height: '40px' }}
              >
                Clear ({activeFiltersCount})
              </Button>
            )}
          </Box>

          {/* Mobile: Collapsible Filters */}
          <Collapse in={showFilters} timeout="auto">
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.5, mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              {/* Availability Filter */}
              <TextField
                select
                label="Availability"
                value={filters.availability}
                onChange={(e) => handleFilterChange('availability', e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="rented">Rented</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </TextField>

              {/* Sort and Order Row */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  select
                  label="Sort By"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="createdAt">Newest</MenuItem>
                  <MenuItem value="pricePerDay">Price</MenuItem>
                  <MenuItem value="make">Make</MenuItem>
                  <MenuItem value="year">Year</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Order"
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="desc">Descending</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
                </TextField>
              </Box>

              {/* Action Buttons Row */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={fetchCars}
                  startIcon={<RefreshOutlined />}
                  size="medium"
                  disabled={loading}
                  fullWidth
                  sx={{ py: 1.2 }}
                >
                  Refresh
                </Button>

                {activeFiltersCount > 0 && (
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    size="medium"
                    color="secondary"
                    fullWidth
                    sx={{ py: 1.2 }}
                  >
                    Clear ({activeFiltersCount})
                  </Button>
                )}
              </Box>
            </Box>
          </Collapse>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <Box sx={{ mt: { xs: 1.5, sm: 2 }, display: 'flex', gap: { xs: 0.75, sm: 1 }, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mr: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Active filters:
              </Typography>
              {activeSearchTerm && (
                <Chip
                  label={`Search: "${activeSearchTerm}"`}
                  size="small"
                  onDelete={() => {
                    setSearchTerm('');
                    setActiveSearchTerm('');
                  }}
                  color="primary"
                  variant="outlined"
                />
              )}
              {Object.entries(filters).map(([key, value]) => {
                if (value && key !== 'sortBy' && key !== 'sortOrder') {
                  return (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      size="small"
                      onDelete={() => handleFilterChange(key, '')}
                      color="primary"
                      variant="outlined"
                    />
                  );
                }
                return null;
              })}
            </Box>
          )}
        </Box>
      </Box>

      {/* Error Display */}
      {error && <InlineError message={error} onClose={() => setError(null)} />}

      {/* Results Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 2, sm: 2.5, md: 3 },
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ color: 'text.secondary', fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
          {loading ? (
            <Skeleton width={{ xs: 150, sm: 200 }} />
          ) : activeSearchTerm ? (
            `${pagination.total} cars found`
          ) : null}
        </Typography>
        
        {pagination.pages > 1 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            Page {pagination.page} of {pagination.pages}
          </Typography>
        )}
      </Box>

      {/* Car Grid */}
      {loading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(280px, 1fr))',
              md: 'repeat(auto-fill, minmax(320px, 1fr))',
              lg: 'repeat(auto-fill, minmax(340px, 1fr))'
            },
            gap: { xs: 2, sm: 2.5, md: 3 },
            width: '100%',
            maxWidth: '100%'
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </Box>
      ) : cars.length === 0 ? (
        <Paper
          sx={{
            p: { xs: 4, sm: 5, md: 6 },
            textAlign: 'center',
            bgcolor: alpha(theme.palette.grey[50], 0.5),
            borderRadius: { xs: 2, sm: 2.5, md: 3 },
          }}
        >
          <DirectionsCarOutlined
            sx={{
              fontSize: { xs: 48, sm: 56, md: 64 },
              color: 'text.secondary',
              mb: { xs: 1.5, sm: 2 },
            }}
          />
          <Typography variant="h5" sx={{ mb: { xs: 1.5, sm: 2 }, color: 'text.primary', fontSize: { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' } }}>
            {activeFiltersCount > 0 ? 'No cars found' : 'No cars available'}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: { xs: 2, sm: 2.5, md: 3 }, fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' }, px: { xs: 2, sm: 0 } }}>
            {activeFiltersCount > 0 
              ? 'Try adjusting your search criteria or filters to find more results.'
              : 'There are currently no cars available for rent. Please check back later.'}
          </Typography>
          {activeFiltersCount > 0 && (
            <Button
              variant="contained"
              onClick={clearFilters}
              startIcon={<RefreshOutlined />}
              sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' } }}
            >
              Clear All Filters
            </Button>
          )}
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(280px, 1fr))',
              md: 'repeat(auto-fill, minmax(320px, 1fr))',
              lg: 'repeat(auto-fill, minmax(340px, 1fr))'
            },
            gap: { xs: 2, sm: 2.5, md: 3 },
            alignItems: 'stretch',
            width: '100%',
            maxWidth: '100%'
          }}
        >
          {cars.map((car, index) => (
            <Zoom in timeout={300 + index * 50} style={{ transitionDelay: `${index * 50}ms` }} key={car._id}>
              <Box sx={{ display: 'flex' }}>
                <ModernCarCard
                  car={car}
                  onFavorite={handleFavorite}
                  onBookNow={handleBookNow}
                  isFavorite={favoriteIds.has(car._id)}
                />
              </Box>
            </Zoom>
          ))}
        </Box>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 4, sm: 5, md: 6 } }}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            size={{ xs: 'medium', sm: 'large' }}
            showFirstButton={{ xs: false, sm: true }}
            showLastButton={{ xs: false, sm: true }}
            siblingCount={{ xs: 0, sm: 1 }}
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: 2,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: 32, sm: 40 },
                height: { xs: 32, sm: 40 },
              },
            }}
          />
        </Box>
      )}
      {/* Booking Modal */}
      {bookingCar && (
        <ModernBookingModal
          open={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setBookingCar(null);
          }}
          car={bookingCar}
          onSuccess={(booking) => {
            handleBookingSuccess(booking);
          }}
        />
      )}
    </Container>
  );
};

export default ModernCarList;

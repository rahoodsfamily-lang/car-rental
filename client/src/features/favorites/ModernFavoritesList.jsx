import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Chip,
  Button,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Skeleton,
  Alert,
  Fade,
  Zoom,
  Pagination,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  FavoriteOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DirectionsCarOutlined,
  LocalOfferOutlined,
  LocationOnOutlined,
  EventOutlined,
  NoteOutlined,
  BookOnlineOutlined,
  InfoOutlined,
  ClearOutlined,
  CalendarTodayOutlined,
  BuildOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from './FavoritesContext';
import { getImageUrl } from '../../utils/imageHelper';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastProvider';
import ModernBookingModal from '../booking/ModernBookingModal';

const ModernFavoritesList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { 
    favorites, 
    loading, 
    removeFromFavorites, 
    updateFavoriteNotes,
    fetchFavorites 
  } = useFavorites();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const [notesDialog, setNotesDialog] = useState({ open: false, favorite: null, notes: '' });
  const [bookingDialog, setBookingDialog] = useState({ open: false, car: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, favorite: null });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Same as Browse Cars page

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter and sort favorites
  const filteredFavorites = favorites
    .filter(fav => {
      if (!fav.car) return false;
      
      const matchesSearch = activeSearchTerm === '' || 
        `${fav.car.make} ${fav.car.model} ${fav.car.year}`.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        fav.notes?.toLowerCase().includes(activeSearchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || fav.car.bodyType === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'price-low':
          return a.car.pricePerDay - b.car.pricePerDay;
        case 'price-high':
          return b.car.pricePerDay - a.car.pricePerDay;
        case 'name':
          return `${a.car.make} ${a.car.model}`.localeCompare(`${b.car.make} ${b.car.model}`);
        default:
          return 0;
      }
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredFavorites.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFavorites = filteredFavorites.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, filterCategory, sortBy]);

  // Predefined car body types
  const bodyTypes = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Minivan', 'Pickup', 'Wagon', 'Crossover'];

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    // Stay at pagination controls, don't scroll to top
  };

  const handleRemoveFavorite = async () => {
    if (deleteDialog.favorite) {
      const success = await removeFromFavorites(deleteDialog.favorite.car._id);
      if (success) {
        setDeleteDialog({ open: false, favorite: null });
        
        // Check if we need to go to previous page after deletion
        const remainingItems = filteredFavorites.length - 1;
        const newTotalPages = Math.ceil(remainingItems / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
      }
    }
  };

  const handleUpdateNotes = async () => {
    if (notesDialog.favorite) {
      const success = await updateFavoriteNotes(notesDialog.favorite.car._id, notesDialog.notes);
      if (success) {
        setNotesDialog({ open: false, favorite: null, notes: '' });
      }
    }
  };

  const handleBookNow = (car) => {
    setBookingDialog({ open: true, car });
  };

  const handleViewDetails = (carId) => {
    navigate(`/cars/${carId}`, { state: { from: 'favorites' } });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((n) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={n}>
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 0, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 0 } }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <FavoriteOutlined sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main' }} />
          My Saved Cars
        </Typography>
        
        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            mb: 3,
            lineHeight: 1.6,
          }}
        >
          {favorites.length} {favorites.length === 1 ? 'car' : 'cars'} saved for quick access
        </Typography>
      </Box>

      {/* Search and Filters - Inline on Desktop */}
      <Box 
        sx={{ 
          mb: { xs: 2, sm: 3, md: 4 }, 
          px: { xs: 2, sm: 0 },
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Bar */}
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 300px' }, minWidth: { xs: '100%', sm: 300 } }}>
            <TextField
              fullWidth
              placeholder={isMobile ? "Search saved cars..." : "Search saved cars by make, model, or notes..."}
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
                      <ClearOutlined fontSize="small" />
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
          
          {/* Body Type Filter */}
          <TextField
            select
            label="Body Type"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">All Body Types</MenuItem>
            {bodyTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>
          
          {/* Sort By */}
          <TextField
            select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="recent">Most Recent</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="price-low">Price (Low to High)</MenuItem>
            <MenuItem value="price-high">Price (High to Low)</MenuItem>
          </TextField>
        </Box>
      </Box>

      {/* Results Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 0 },
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          {activeSearchTerm || filterCategory !== 'all' ? (
            `${filteredFavorites.length} ${filteredFavorites.length === 1 ? 'car' : 'cars'} found`
          ) : null}
        </Typography>
        
        {totalPages > 1 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Page {currentPage} of {totalPages}
          </Typography>
        )}
      </Box>

      {/* Favorites Grid */}
      {filteredFavorites.length > 0 ? (
        <Fade in timeout={500}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(auto-fill, minmax(280px, 1fr))',
                md: 'repeat(auto-fill, minmax(320px, 1fr))',
              },
              gap: { xs: 2, sm: 3 },
              px: { xs: 2, sm: 0 },
            }}
          >
            {paginatedFavorites.map((favorite, index) => (
              <Zoom in timeout={300 + index * 50} style={{ transitionDelay: `${index * 50}ms` }} key={favorite._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: { xs: 'none', sm: 'translateY(-4px)' },
                      boxShadow: { xs: 'none', sm: theme.shadows[8] },
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="180"
                    image={
                      getImageUrl(favorite.car.imageUrls?.[0] || '/uploads/default-car.jpg')
                    }
                    alt={`${favorite.car.make} ${favorite.car.model}`}
                    sx={{ height: { xs: 180, sm: 200 }, position: 'relative' }}
                    onClick={() => handleViewDetails(favorite.car._id)}
                  />
                  
                  <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        {favorite.car.year} {favorite.car.make}
                      </Typography>
                      <Chip
                        label={(() => {
                          const car = favorite.car;
                          // Check if car is in maintenance first
                          if (car.maintenanceStatus === 'in_progress' || car.availability === 'maintenance') {
                            return 'In Maintenance';
                          } else if (car.maintenanceStatus === 'scheduled') {
                            return 'Maintenance Scheduled';
                          } else if (car.availability === 'available') {
                            return 'Available Now';
                          } else if (car.availability === 'rented') {
                            return 'Currently Rented';
                          } else if (car.availableFrom) {
                            return `Available ${new Date(car.availableFrom).toLocaleDateString()}`;
                          }
                          return 'Unavailable';
                        })()}
                        icon={(() => {
                          const car = favorite.car;
                          // Check if car is in maintenance first
                          if (car.maintenanceStatus === 'in_progress' || car.availability === 'maintenance') {
                            return <BuildOutlined fontSize="small" />;
                          } else if (car.maintenanceStatus === 'scheduled') {
                            return <BuildOutlined fontSize="small" />;
                          } else if (car.availability === 'available') {
                            return <DirectionsCarOutlined fontSize="small" />;
                          } else if (car.availability === 'rented') {
                            return <DirectionsCarOutlined fontSize="small" />;
                          } else if (car.availableFrom) {
                            return <CalendarTodayOutlined fontSize="small" />;
                          }
                          return <DirectionsCarOutlined fontSize="small" />;
                        })()}
                        size="small"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                        color={(() => {
                          const car = favorite.car;
                          // Check if car is in maintenance first
                          if (car.maintenanceStatus === 'in_progress' || car.availability === 'maintenance') {
                            return 'error';
                          } else if (car.maintenanceStatus === 'scheduled') {
                            return 'warning';
                          } else if (car.availability === 'available') {
                            return 'success';
                          } else if (car.availability === 'rented') {
                            return 'warning';
                          } else if (car.availableFrom) {
                            return 'warning';
                          }
                          return 'error';
                        })()}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {favorite.car.model}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                      <LocalOfferOutlined fontSize="small" color="primary" />
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        ₱{favorite.car.pricePerDay}/day
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                      <LocationOnOutlined fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {favorite.car.location || 'Location not specified'}
                      </Typography>
                    </Box>
                    
                    {favorite.notes && (
                      <Box display="flex" alignItems="start" gap={0.5} mt={1}>
                        <NoteOutlined fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          "{favorite.notes}"
                        </Typography>
                      </Box>
                    )}
                    
                    <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                      <EventOutlined fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Saved {new Date(favorite.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ p: { xs: 1.5, sm: 2 }, pt: 0, gap: { xs: 0.75, sm: 1 }, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<BookOnlineOutlined />}
                      onClick={() => handleBookNow(favorite.car)}
                      disabled={favorite.car.availability !== 'available'}
                      sx={{ flex: 1, fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                    >
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                        {favorite.car.availability === 'available' ? 'Book Now' : 
                         favorite.car.availability === 'rented' ? 'Currently Rented' : 'Under Maintenance'}
                      </Box>
                      <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                        {favorite.car.availability === 'available' ? 'Book' : 
                         favorite.car.availability === 'rented' ? 'Rented' : 'Maintenance'}
                      </Box>
                    </Button>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => handleViewDetails(favorite.car._id)}>
                        <InfoOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Notes">
                      <IconButton 
                        size="small"
                        onClick={() => setNotesDialog({ 
                          open: true, 
                          favorite, 
                          notes: favorite.notes || '' 
                        })}
                      >
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove from Favorites">
                      <IconButton 
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, favorite })}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Zoom>
            ))}
          </Box>
        </Fade>
      ) : (
        <Paper
          sx={{
            p: { xs: 4, sm: 6 },
            textAlign: 'center',
            bgcolor: alpha(theme.palette.grey[50], 0.5),
            mx: { xs: 2, sm: 0 },
            borderRadius: { xs: 1, sm: 2 },
          }}
        >
          <DirectionsCarOutlined sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {searchTerm || filterCategory !== 'all' 
              ? 'No cars match your filters' 
              : 'No saved cars yet'}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {searchTerm || filterCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start browsing and save cars you like for quick access later'}
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<DirectionsCarOutlined />}
            onClick={() => navigate('/cars')}
            sx={{ mt: 2 }}
          >
            Browse Available Cars
          </Button>
        </Paper>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}

      {/* Notes Dialog */}
      <Dialog 
        open={notesDialog.open} 
        onClose={() => setNotesDialog({ open: false, favorite: null, notes: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Notes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Personal notes about this car"
            value={notesDialog.notes}
            onChange={(e) => setNotesDialog(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g., Perfect for weekend trips, spacious trunk..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialog({ open: false, favorite: null, notes: '' })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpdateNotes}>
            Save Notes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, favorite: null })}
      >
        <DialogTitle>Remove from Favorites?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {deleteDialog.favorite?.car.make} {deleteDialog.favorite?.car.model} from your favorites?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, favorite: null })}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleRemoveFavorite}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Booking Modal */}
      {bookingDialog.car && (
        <ModernBookingModal
          open={bookingDialog.open}
          onClose={() => setBookingDialog({ open: false, car: null })}
          car={bookingDialog.car}
          onSuccess={() => {
            // Navigate to bookings page after success
            setTimeout(() => {
              navigate('/my-bookings');
            }, 2000);
          }}
        />
      )}
    </Container>
  );
};

export default ModernFavoritesList;

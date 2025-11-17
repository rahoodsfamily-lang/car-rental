import React, { useState } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LocalGasStationOutlined,
  PeopleOutlined,
  LuggageOutlined,
  SettingsOutlined,
  CalendarTodayOutlined,
  Star,
  StarBorder,
  DirectionsCarOutlined,
  ChevronLeft,
  ChevronRight,
  BuildOutlined,
  FavoriteOutlined,
  FavoriteBorderOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils/imageHelper';

const ModernCarCard = ({ car, onFavorite, onBookNow, isFavorite = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const {
    _id,
    imageUrls = [],
    year,
    make,
    model,
    trim,
    pricePerDay,
    availability,
    availableFrom,
    fuelType,
    transmission,
    seats,
    luggageCapacity,
    averageRating = 0,
    reviewCount = 0,
    maintenanceStatus,
  } = car;

  const title = `${year} ${make} ${model}${trim ? ` ${trim}` : ''}`;
  const rentalPrice = pricePerDay ? `₱${pricePerDay}` : 'Contact';
  
  const getAvailabilityStatus = () => {
    // Check if car is in maintenance first
    if (maintenanceStatus === 'in_progress' || availability === 'maintenance') {
      return { text: 'In Maintenance', color: 'error', icon: <BuildOutlined fontSize="small" /> };
    } else if (maintenanceStatus === 'scheduled') {
      return { text: 'Maintenance Scheduled', color: 'warning', icon: <BuildOutlined fontSize="small" /> };
    } else if (availability === 'available') {
      return { text: 'Available Now', color: 'success', icon: <DirectionsCarOutlined fontSize="small" /> };
    } else if (availability === 'rented') {
      return { text: 'Currently Rented', color: 'warning', icon: <DirectionsCarOutlined fontSize="small" /> };
    } else if (availableFrom) {
      return { 
        text: `Available ${new Date(availableFrom).toLocaleDateString()}`, 
        color: 'warning',
        icon: <CalendarTodayOutlined fontSize="small" />
      };
    }
    return { text: 'Unavailable', color: 'error', icon: <DirectionsCarOutlined fontSize="small" /> };
  };

  const availabilityStatus = getAvailabilityStatus();

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => {
      return index < Math.round(rating) ? (
        <Star key={index} sx={{ color: '#ffc107', fontSize: 16 }} />
      ) : (
        <StarBorder key={index} sx={{ color: '#e0e0e0', fontSize: 16 }} />
      );
    });
  };

  const handleViewDetails = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/cars/${_id}`);
  };

  const handleBookNow = (e) => {
    e.stopPropagation();
    if (onBookNow) {
      onBookNow(car);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onFavorite) {
      onFavorite(_id);
    }
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === 0 ? imageUrls.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === imageUrls.length - 1 ? 0 : prev + 1
    );
  };



  return (
    <>
    <Card
      sx={{
        width: '100%',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        height: { xs: 420, sm: 450, md: 480 },
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-4px)' },
          boxShadow: { xs: theme.shadows[4], sm: theme.shadows[12] },
        },
        transition: 'all 0.3s ease-in-out',
        boxShadow: { xs: theme.shadows[2], sm: theme.shadows[4] },
      }}
      onClick={handleViewDetails}
    >


      {/* Car Image with Carousel */}
      <Box 
        sx={{ 
          position: 'relative', 
          overflow: 'hidden', 
          height: { xs: 180, sm: 190, md: 200 }, 
          flexShrink: 0,
          bgcolor: 'grey.50',
        }}
      >
        {imageUrls && imageUrls.length > 0 ? (
          <>
            <CardMedia
              component="img"
              image={getImageUrl(imageUrls[currentImageIndex])}
              alt={title}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                transition: 'transform 0.3s ease-in-out',
              }}
            />
            
            {/* Carousel Navigation */}
            {imageUrls.length > 1 && (
              <>
                <IconButton
                  onClick={handlePrevImage}
                  size="small"
                  sx={{
                    position: 'absolute',
                    left: { xs: 4, sm: 8 },
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 },
                  }}
                >
                  <ChevronLeft sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </IconButton>
                
                <IconButton
                  onClick={handleNextImage}
                  size="small"
                  sx={{
                    position: 'absolute',
                    right: { xs: 4, sm: 8 },
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 },
                  }}
                >
                  <ChevronRight sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </IconButton>
                
                {/* Image Indicators */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  {imageUrls.map((_, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: currentImageIndex === index ? 'white' : 'rgba(255, 255, 255, 0.5)',
                        transition: 'all 0.3s',
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </>
        ) : (
          // Professional car placeholder pattern
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, 
                ${theme.palette.grey[100]} 0%, 
                ${theme.palette.grey[50]} 50%, 
                ${theme.palette.grey[100]} 100%)`,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  ${alpha(theme.palette.primary.main, 0.05)} 10px,
                  ${alpha(theme.palette.primary.main, 0.05)} 20px
                )`,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
                zIndex: 1,
                textAlign: 'center',
              }}
            >
              <DirectionsCarOutlined 
                sx={{ 
                  fontSize: 64, 
                  color: 'primary.main',
                  opacity: 0.6,
                }} 
              />
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: 'text.primary',
                    fontWeight: 600,
                    mb: 0.5,
                  }}
                >
                  {title}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  }}
                >
                  Image Coming Soon
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Availability Badge */}
        <Chip
          label={availabilityStatus.text}
          color={availabilityStatus.color}
          size="small"
          icon={availabilityStatus.icon}
          sx={{
            position: 'absolute',
            top: { xs: 8, sm: 12 },
            left: { xs: 8, sm: 12 },
            fontWeight: 600,
            zIndex: 2,
            height: { xs: 24, sm: 28 },
            fontSize: { xs: '0.7rem', sm: '0.75rem' },
            '& .MuiChip-icon': {
              fontSize: { xs: 14, sm: 16 },
            },
          }}
        />

        {/* Favorite Button */}
        <IconButton
          onClick={handleFavoriteClick}
          size="small"
          sx={{
            position: 'absolute',
            top: { xs: 8, sm: 12 },
            right: { xs: 8, sm: 12 },
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              bgcolor: 'white',
            },
            zIndex: 2,
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
          }}
        >
          {isFavorite ? (
            <FavoriteOutlined sx={{ color: 'error.main', fontSize: { xs: 20, sm: 24 } }} />
          ) : (
            <FavoriteBorderOutlined sx={{ fontSize: { xs: 20, sm: 24 } }} />
          )}
        </IconButton>
      </Box>

      {/* Card Content */}
      <CardContent 
        sx={{ 
          p: { xs: 2, sm: 2.5 }, 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: 0, // Allow content to shrink if needed
          height: 280, // Fixed content height
        }}
      >
        {/* Car Title */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mb: { xs: 0.75, sm: 1 },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
            }}
          >
            {title}
          </Typography>
          
          {/* Price and Rating Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Price on Left */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  fontSize: { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' },
                }}
              >
                {rentalPrice}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                /day
              </Typography>
            </Box>
            
            {/* Rating on Right */}
            {reviewCount > 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {renderStars(averageRating)}
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  {averageRating.toFixed(1)}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {renderStars(0)}
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  New
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Car Specifications - Always show all 4 fields */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: { xs: 1, sm: 1.5 },
            mb: { xs: 1.5, sm: 2 },
            minHeight: { xs: 70, sm: 80 }, // Ensure consistent space for specs
          }}
        >
          {/* Fuel Type - Always show */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
            <LocalGasStationOutlined
              sx={{ fontSize: { xs: 16, sm: 18 }, color: 'text.secondary' }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              {fuelType || 'Gas'}
            </Typography>
          </Box>
          
          {/* Transmission - Always show */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsOutlined
              sx={{ fontSize: 18, color: 'text.secondary' }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {transmission || 'Automatic'}
            </Typography>
          </Box>
          
          {/* Seats - Always show */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleOutlined
              sx={{ fontSize: 18, color: 'text.secondary' }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {seats || 4} Seats
            </Typography>
          </Box>
          
          {/* Luggage Capacity - Always show */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LuggageOutlined
              sx={{ fontSize: 18, color: 'text.secondary' }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {luggageCapacity || 2} Bags
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, mt: 'auto' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleViewDetails}
            sx={{
              flex: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
              py: { xs: 0.75, sm: 1 },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>View Details</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Details</Box>
          </Button>
          
          {availability === 'available' && (
            <Button
              variant="contained"
              size="small"
              onClick={handleBookNow}
              startIcon={<CalendarTodayOutlined sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                py: { xs: 0.75, sm: 1 },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Book Now</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Book</Box>
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
    </>
  );
};


export default ModernCarCard;

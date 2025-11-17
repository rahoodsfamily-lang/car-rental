import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Box, TextField, Button, Typography, Paper, Grid, Stack, Alert, Snackbar } from '@mui/material';
import { MyLocationOutlined, SearchOutlined } from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle map clicks
function LocationMarker({ position, setPosition, debouncedSetPosition }) {
  useMapEvents({
    click(e) {
      // Update the UI immediately
      setPosition(e.latlng);
      // But debounce the API call
      debouncedSetPosition(e.latlng);
    },
  });

  return position === null ? null : <Marker position={position} />;
}

// Debounce function to prevent rapid API calls
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const LocationPicker = ({ 
  latitude, 
  longitude, 
  address,
  onLocationChange,
  height = '400px' 
}) => {
  // API URL configuration
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Default to Bongao, Tawi-Tawi, Philippines
  const defaultLat = 5.0293;
  const defaultLng = 119.7739;
  
  const [position, setPosition] = useState(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [searchAddress, setSearchAddress] = useState(address || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef();
  const lastSearchTime = useRef(0);

  // Generate a fallback address from coordinates
  const generateFallbackAddress = (lat, lng) => {
    return `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const handlePositionChange = async (newPosition) => {
    setPosition(newPosition);
    setIsLoading(true);
    
    // Reverse geocode to get address from coordinates
    let addressFromCoords = searchAddress;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/geocoding/reverse?lat=${newPosition.lat}&lon=${newPosition.lng}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'CarRentalSystem/1.0'
          }
        }
      );
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        // Use status code to provide better error messages
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again in a moment.');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication error. Please log in again.');
        } else {
          throw new Error(`Server error (${response.status}). Please try again later.`);
        }
      }
      
      const result = await response.json();
      const data = result.data;
      if (data && data.display_name) {
        // Check if we have specific address components
        const address = data.address;
        let shortAddress = '';
        
        // Priority: landmark/building > road/street > village > city
        if (address) {
          const parts = [];
          
          // Add landmark/building if available
          if (address.tourism || address.amenity || address.building) {
            parts.push(address.tourism || address.amenity || address.building);
          }
          
          // Add road/street if available
          if (address.road) {
            parts.push(address.road);
          }
          
          // Add village/suburb/neighbourhood
          if (address.village || address.suburb || address.neighbourhood) {
            parts.push(address.village || address.suburb || address.neighbourhood);
          }
          
          // Add city/town
          if (address.city || address.town || address.municipality) {
            parts.push(address.city || address.town || address.municipality);
          }
          
          // Add province/state
          if (address.state || address.province) {
            parts.push(address.state || address.province);
          }
          
          // Take first 3 parts for clean address
          shortAddress = parts.slice(0, 3).join(', ');
        }
        
        // Fallback to display_name if no structured address
        if (!shortAddress) {
          const parts = data.display_name.split(',').map(p => p.trim());
          shortAddress = parts.slice(0, 3).join(', ');
        }
        
        addressFromCoords = shortAddress;
        setSearchAddress(shortAddress);
      } else {
        // If no display_name, use fallback
        addressFromCoords = generateFallbackAddress(newPosition.lat, newPosition.lng);
        setSearchAddress(addressFromCoords);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Use fallback address format instead of showing nothing
      addressFromCoords = generateFallbackAddress(newPosition.lat, newPosition.lng);
      setSearchAddress(addressFromCoords);
      
      // Show a non-blocking error message
      setErrorMessage(`Couldn't get address details: ${error.message}. Using coordinates instead.`);
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
    
    if (onLocationChange) {
      onLocationChange(newPosition.lat, newPosition.lng, addressFromCoords);
    }
  };
  
  // Create a debounced version of handlePositionChange
  const debouncedHandlePositionChange = useCallback(
    debounce((newPosition) => handlePositionChange(newPosition), 300),
    []
  );

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          handlePositionChange(newPos);
          if (mapRef.current) {
            mapRef.current.setView([newPos.lat, newPos.lng], 15);
          }
          setIsLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoading(false);
          
          let errorMessage = 'Unable to get your current location';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please try again later.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          
          setErrorMessage(errorMessage);
          setShowError(true);
        },
        { timeout: 10000, enableHighAccuracy: true } // 10 second timeout, high accuracy
      );
    } else {
      setErrorMessage('Geolocation is not supported by your browser. Please enter your location manually.');
      setShowError(true);
    }
  };

  // Simple geocoding using Nominatim (OpenStreetMap) with rate limiting protection
  const handleSearchAddress = async () => {
    if (!searchAddress.trim()) return;
    
    // Rate limiting check - ensure at least 1 second between requests
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime.current;
    if (timeSinceLastSearch < 1000) { // 1000ms = 1 second
      setErrorMessage('Please wait a moment before searching again.');
      setShowError(true);
      return;
    }
    
    lastSearchTime.current = now;
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`,
        {
          headers: {
            'User-Agent': 'CarRentalSystem/1.0' // Required by Nominatim
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many search requests. Please try again in a moment.');
        } else {
          throw new Error(`Server error (${response.status}). Please try again later.`);
        }
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const newPos = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        handlePositionChange(newPos);
        if (mapRef.current) {
          mapRef.current.setView([newPos.lat, newPos.lng], 15);
        }
      } else {
        // Suggest alternatives instead of just saying "not found"
        setErrorMessage('Address not found. Try adding city/region name or use more specific terms.');
        setShowError(true);
      }
    } catch (error) {
      console.error('Error searching address:', error);
      setErrorMessage(`Search error: ${error.message}`);
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a debounced version of the search function
  const debouncedHandleSearchAddress = useCallback(
    debounce(() => handleSearchAddress(), 500),
    [searchAddress]
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Snackbar 
        open={showError} 
        autoHideDuration={6000} 
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowError(false)} 
          severity="warning" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
      
      <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2 }}>
        <TextField
          label="Search Address"
          value={searchAddress}
          onChange={(e) => {
            setSearchAddress(e.target.value);
            if (onLocationChange && position) {
              onLocationChange(position.lat, position.lng, e.target.value);
            }
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearchAddress();
            }
          }}
          placeholder="Enter address or location"
          size="small"
          fullWidth
          disabled={isLoading}
          sx={{
            '& .MuiInputLabel-root': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
              whiteSpace: 'nowrap',
              overflow: 'visible',
            },
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
            }
          }}
        />
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="outlined"
            onClick={handleSearchAddress}
            startIcon={<SearchOutlined />}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 120 } }}
            size="medium"
            disabled={isLoading || !searchAddress.trim()}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleGetCurrentLocation}
            startIcon={<MyLocationOutlined />}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 180 } }}
            size="medium"
            disabled={isLoading}
          >
            {isLoading ? 'Locating...' : 'Use My Location'}
          </Button>
        </Box>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
        Click on the map to set the car's location
      </Typography>

      <Box sx={{ 
        height: typeof height === 'object' ? height : { xs: '300px', sm: '400px', md: height }, 
        width: '100%', 
        maxWidth: '100%',
        borderRadius: 2, 
        overflow: 'hidden', 
        border: '1px solid', 
        borderColor: 'divider',
        boxSizing: 'border-box',
      }}>
        <MapContainer
          center={position ? [position.lat, position.lng] : [defaultLat, defaultLng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            debouncedSetPosition={debouncedHandlePositionChange} 
          />
        </MapContainer>
      </Box>

      {position && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            Selected Location:
          </Typography>
          <Typography variant="body2">
            Latitude: {position.lat.toFixed(6)}, Longitude: {position.lng.toFixed(6)}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default LocationPicker;

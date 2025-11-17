import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Box, Typography, Paper } from '@mui/material';
import { LocationOnOutlined } from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issue with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom car marker icon
const carIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#1976d2">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const CarLocationMap = ({ 
  latitude, 
  longitude, 
  address, 
  carName,
  height = '400px',
  zoom = 15 
}) => {
  // Default to Bongao, Tawi-Tawi, Philippines if no coordinates provided
  const defaultLat = 5.0293;
  const defaultLng = 119.7739;
  
  const lat = latitude || defaultLat;
  const lng = longitude || defaultLng;

  if (!latitude || !longitude) {
    return (
      <Paper 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          bgcolor: 'grey.100',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <LocationOnOutlined sx={{ fontSize: 48, color: 'text.secondary' }} />
        <Typography variant="body1" color="text.secondary">
          Location not available for this car
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ height, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={carIcon}>
          <Popup>
            <Box sx={{ p: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {carName || 'Car Location'}
              </Typography>
              {address && (
                <Typography variant="caption" color="text.secondary">
                  {address}
                </Typography>
              )}
            </Box>
          </Popup>
        </Marker>
      </MapContainer>
    </Box>
  );
};

export default CarLocationMap;

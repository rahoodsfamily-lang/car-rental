const axios = require('axios');

// Reverse geocode coordinates to address
exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Call Nominatim API from backend (avoids CORS issues)
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse`,
      {
        params: {
          format: 'json',
          lat,
          lon
        },
        headers: {
          'User-Agent': 'CarRentalSystem/1.0' // Required by Nominatim
        }
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Geocoding error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reverse geocode coordinates',
      error: error.message
    });
  }
};

// Forward geocode address to coordinates
exports.forwardGeocode = async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }
    
    // Call Nominatim API from backend
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          format: 'json',
          q: address,
          limit: 5
        },
        headers: {
          'User-Agent': 'CarRentalSystem/1.0'
        }
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Geocoding error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to geocode address',
      error: error.message
    });
  }
};

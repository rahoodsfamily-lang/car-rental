const express = require('express');
const router = express.Router();
const { reverseGeocode, forwardGeocode } = require('../controllers/geocodingController');
const { protect } = require('../middleware/authMiddleware');

// Protect all geocoding routes (require authentication)
router.use(protect);

// Reverse geocode (coordinates to address)
router.get('/reverse', reverseGeocode);

// Forward geocode (address to coordinates)
router.get('/search', forwardGeocode);

module.exports = router;

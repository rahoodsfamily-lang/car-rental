const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');
const { uploadCarImage } = require('../config/uploadConfig');
const {
  getCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
} = require('../controllers/carController');
const { getCarMaintenanceHistory } = require('../controllers/maintenanceController');

// Get all cars with pagination and filtering
router.get('/', getCars);

// Get car by ID
router.get('/:id', getCarById);

// Get maintenance history for a specific car (public route)
router.get('/:id/maintenance', getCarMaintenanceHistory);

// Create a new car (admin only)
router.post('/', authenticate, authorizeAdmin, uploadCarImage.array('images', 5), createCar);

// Update a car (admin only)
router.put('/:id', authenticate, authorizeAdmin, uploadCarImage.array('images', 5), updateCar);

// Delete a car (admin only)
router.delete('/:id', authenticate, authorizeAdmin, deleteCar);

module.exports = router;

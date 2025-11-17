const express = require('express');
const router = express.Router();
const { 
  createBooking,
  getUserBookings,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,
  updateBooking,
  extendBooking
} = require('../controllers/bookingController');
const { getUnavailableDates } = require('../controllers/unavailableController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

// All routes start with /api/bookings

// Create a new booking
router.post('/', authenticate, createBooking);

// Get all bookings for a user
router.get('/user/:userId', authenticate, getUserBookings);

// Get all bookings (admin only)
router.get('/', authenticate, authorizeAdmin, getAllBookings);

// Export bookings (admin only)
const { exportBookings } = require('../controllers/bookingExportController');
router.get('/export', authenticate, authorizeAdmin, exportBookings);

// Get booking by ID
router.get('/:id', authenticate, getBookingById);

// Update booking status (admin only)
router.put('/:id/status', authenticate, authorizeAdmin, updateBookingStatus);

// Update booking (for pending bookings)
router.put('/:id', authenticate, updateBooking);

// Cancel booking
router.put('/:id/cancel', authenticate, cancelBooking);

// Extend booking (for active rentals)
router.put('/:id/extend', authenticate, extendBooking);

// Get unavailable date ranges for a car
router.get('/car/:carId/unavailable', authenticate, getUnavailableDates);

// Delete booking (admin only)
router.delete('/:id', authenticate, authorizeAdmin, deleteBooking);

module.exports = router;

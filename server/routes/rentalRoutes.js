const express = require('express');
const router = express.Router();
const { 
  getAllRentals,
  getRentalById,
  createRental,
  completeRental,
  updateRentalStatus,
  getUserRentals,
  getCurrentRentals,
  extendRental,
  submitRentalReview,
  generateInvoice,
  downloadInvoice
} = require('../controllers/rentalController');
const { protect, admin } = require('../middleware/authMiddleware');

// Admin routes
router.route('/')
  .get(protect, admin, getAllRentals);

// User routes
router.route('/user')
  .get(protect, getUserRentals);

router.route('/current')
  .get(protect, getCurrentRentals);

router.route('/:id')
  .get(protect, getRentalById)
  .put(protect, admin, updateRentalStatus);

router.route('/:id/checkout')
  .post(protect, admin, createRental);

router.route('/:id/checkin')
  .put(protect, admin, completeRental);

router.route('/:id/invoice')
  .get(protect, generateInvoice);

router.route('/:id/invoice/download')
  .get(protect, downloadInvoice);

router.route('/:id/extend')
  .patch(protect, extendRental);

router.route('/:id/review')
  .post(protect, submitRentalReview);

module.exports = router;

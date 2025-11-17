const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');
const { 
  getFleetStatus, 
  getRevenueReport, 
  getBookingStats,
  getAllUsers,
  createUser,
  updateUserRole,
  deactivateUser,
  updateUser,
  deleteUser,
  getDashboardStats,
  getActivityFeed,
  getReports
} = require('../controllers/adminController');
const { getCars, createCar, updateCar, deleteCar } = require('../controllers/carController');
const { uploadCarImage } = require('../config/uploadConfig');
const { exportReport } = require('../controllers/reportController');
const { exportData } = require('../controllers/dataExportController');
const { checkOverdueRentals } = require('../utils/overdueChecker');

// Admin dashboard routes
router.route('/fleet-status')
  .get(authenticate, authorizeAdmin, getFleetStatus);

router.route('/revenue-report')
  .get(authenticate, authorizeAdmin, getRevenueReport);

router.route('/booking-stats')
  .get(authenticate, authorizeAdmin, getBookingStats);

// Report export route
router.route('/export-report')
  .get(authenticate, authorizeAdmin, exportReport);

// Data export route (bookings/rentals)
router.route('/export-data')
  .get(authenticate, authorizeAdmin, exportData);

// Car management routes
router.route('/cars')
  .get(authenticate, authorizeAdmin, getCars)
  .post(authenticate, authorizeAdmin, uploadCarImage.array('images', 5), createCar);

router.route('/cars/:id')
  .put(authenticate, authorizeAdmin, uploadCarImage.array('images', 5), updateCar)
  .delete(authenticate, authorizeAdmin, deleteCar);

// User management routes
router.route('/users')
  .get(authenticate, authorizeAdmin, getAllUsers)
  .post(authenticate, authorizeAdmin, createUser);

router.route('/users/:userId')
  .put(authenticate, authorizeAdmin, updateUser)
  .delete(authenticate, authorizeAdmin, deleteUser);

router.route('/users/:userId/role')
  .put(authenticate, authorizeAdmin, updateUserRole);

router.route('/users/:userId/deactivate')
  .put(authenticate, authorizeAdmin, deactivateUser);

// Dashboard and analytics routes
router.route('/stats')
  .get(authenticate, authorizeAdmin, getDashboardStats);

router.route('/activity')
  .get(authenticate, authorizeAdmin, getActivityFeed);

router.route('/reports')
  .get(authenticate, authorizeAdmin, getReports);

// Manual overdue check route
router.route('/check-overdue')
  .post(authenticate, authorizeAdmin, async (req, res) => {
    try {
      console.log('Manual overdue check triggered by admin:', req.user.email);
      await checkOverdueRentals();
      res.json({ 
        success: true, 
        message: 'Overdue rental check completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Manual overdue check failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to run overdue check', 
        error: error.message 
      });
    }
  });

module.exports = router;

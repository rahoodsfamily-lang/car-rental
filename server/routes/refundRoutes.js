const express = require('express');
const router = express.Router();
const {
  getPendingRefunds,
  getProcessedRefunds,
  getRefundStatistics,
  processRefund,
  getRefundPolicy
} = require('../controllers/refundController');
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');

// Public route - Get refund policy
router.get('/policy', getRefundPolicy);

// Protected admin routes
router.get('/pending', protect, authorizeAdmin, getPendingRefunds);
router.get('/processed', protect, authorizeAdmin, getProcessedRefunds);
router.get('/statistics', protect, authorizeAdmin, getRefundStatistics);
router.post('/:paymentId/process', protect, authorizeAdmin, processRefund);

module.exports = router;

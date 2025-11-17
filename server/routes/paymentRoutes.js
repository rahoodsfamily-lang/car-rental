const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getPaymentSettings,
  updatePaymentSettings,
  createPayment,
  getPaymentByBooking,
  getAllPayments,
  verifyPayment
} = require('../controllers/paymentController');

// Custom multer config for payment settings with larger field size
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const paymentUpload = multer({
  storage: paymentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,    // 5MB file limit
    fieldSize: 10 * 1024 * 1024,  // 10MB field size limit
    fields: 20                     // Allow more fields
  }
});

// Public routes
router.get('/settings', getPaymentSettings);

// Protected routes (customer)
router.post('/', protect, upload.single('paymentProof'), createPayment);
router.get('/booking/:bookingId', protect, getPaymentByBooking);

// Admin routes
router.put('/settings', protect, admin, paymentUpload.fields([
  { name: 'gcashQRCode', maxCount: 1 },
  { name: 'paymayaQRCode', maxCount: 1 }
]), updatePaymentSettings);
router.get('/all', protect, admin, getAllPayments);
router.put('/:paymentId/verify', protect, admin, verifyPayment);

module.exports = router;

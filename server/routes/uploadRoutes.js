const express = require('express');
const router = express.Router();
const {
  uploadSingle,
  uploadMultiple,
  handleSingleUpload,
  handleMultipleUpload,
  deleteFile
} = require('../controllers/uploadController');
const { authenticate } = require('../middleware/authMiddleware');

// All upload routes require authentication
router.use(authenticate);

// Single file upload
router.post('/single', uploadSingle, handleSingleUpload);

// Multiple files upload
router.post('/multiple', uploadMultiple, handleMultipleUpload);

// Delete file
router.delete('/:filename', deleteFile);

module.exports = router;

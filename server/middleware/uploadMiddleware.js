// Use the configurable upload system that supports both local and Cloudinary
const { createUpload } = require('../config/uploadConfig');

// Create payment proof upload middleware
// This will automatically use Cloudinary if configured, otherwise local storage
const upload = createUpload('payments', {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file limit
    fieldSize: 2 * 1024 * 1024  // 2MB field size limit (for text fields)
  }
});

module.exports = upload;

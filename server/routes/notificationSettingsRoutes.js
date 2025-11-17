const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  getSettings,
  updateSettings,
  resetSettings,
  getNotificationTypes
} = require('../controllers/notificationSettingsController');

// All routes require authentication
router.use(authenticate);

// Get notification types list (for UI dropdowns)
router.get('/types', getNotificationTypes);

// Get user's notification settings
router.get('/', getSettings);

// Update notification settings
router.put('/', updateSettings);

// Reset to default settings
router.post('/reset', resetSettings);

module.exports = router;

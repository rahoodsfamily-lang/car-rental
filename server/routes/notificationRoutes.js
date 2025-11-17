const express = require('express');
const router = express.Router();
const { 
  createNotification,
  getUserNotifications,
  markAsSeen,
  markAllAsSeen,
  deleteNotification,
  getNotificationCount
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

// Create a new notification (admin only)
router.post('/', protect, admin, createNotification);

// Mark notification as seen
router.put('/:id/seen', protect, markAsSeen);

// Mark all notifications as seen for a user
router.put('/:userId/seen-all', protect, markAllAsSeen);

// Delete a notification
router.delete('/:id', protect, deleteNotification);

// Get notification count for a user
router.get('/:userId/count', protect, getNotificationCount);

// Get user notifications (keep generic route last)
router.get('/:userId', protect, getUserNotifications);

module.exports = router;

const NotificationSettings = require('../models/NotificationSettings');

// Get user's notification settings
const getSettings = async (req, res) => {
  try {
    const settings = await NotificationSettings.getOrCreate(req.user._id);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification settings',
      error: error.message
    });
  }
};

// Update user's notification settings
const updateSettings = async (req, res) => {
  try {
    const { enableInApp, enableEmail, preferences, quietHours } = req.body;
    
    let settings = await NotificationSettings.findOne({ userId: req.user._id });
    
    if (!settings) {
      settings = new NotificationSettings({ userId: req.user._id });
    }
    
    // Update global settings
    if (typeof enableInApp !== 'undefined') {
      settings.enableInApp = enableInApp;
    }
    if (typeof enableEmail !== 'undefined') {
      settings.enableEmail = enableEmail;
    }
    
    // Update per-type preferences
    if (preferences) {
      Object.keys(preferences).forEach(notificationType => {
        if (settings.preferences[notificationType]) {
          if (typeof preferences[notificationType].inApp !== 'undefined') {
            settings.preferences[notificationType].inApp = preferences[notificationType].inApp;
          }
          if (typeof preferences[notificationType].email !== 'undefined') {
            settings.preferences[notificationType].email = preferences[notificationType].email;
          }
        }
      });
      settings.markModified('preferences');
    }
    
    // Update quiet hours
    if (quietHours) {
      if (typeof quietHours.enabled !== 'undefined') {
        settings.quietHours.enabled = quietHours.enabled;
      }
      if (quietHours.startTime) {
        settings.quietHours.startTime = quietHours.startTime;
      }
      if (quietHours.endTime) {
        settings.quietHours.endTime = quietHours.endTime;
      }
      settings.markModified('quietHours');
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: error.message
    });
  }
};

// Reset to default settings
const resetSettings = async (req, res) => {
  try {
    await NotificationSettings.findOneAndDelete({ userId: req.user._id });
    
    // Create new default settings
    const settings = await NotificationSettings.create({ userId: req.user._id });
    
    res.json({
      success: true,
      message: 'Notification settings reset to defaults',
      data: settings
    });
  } catch (error) {
    console.error('Error resetting notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset notification settings',
      error: error.message
    });
  }
};

// Get notification types list (for UI)
const getNotificationTypes = (req, res) => {
  const types = [
    {
      category: 'Booking Notifications',
      types: [
        { key: 'bookingConfirmation', label: 'Booking Confirmation', description: 'When your booking is confirmed by admin', hasInApp: true, hasEmail: false },
        { key: 'bookingReminder', label: 'Booking Reminder', description: '24 hours before delivery', hasInApp: true, hasEmail: false },
        { key: 'bookingCancellation', label: 'Booking Cancellation', description: 'When a booking is cancelled', hasInApp: true, hasEmail: false },
        { key: 'bookingRejection', label: 'Booking Rejection', description: 'When your booking is rejected by admin', hasInApp: true, hasEmail: false }
      ]
    },
    {
      category: 'Rental Notifications',
      types: [
        { key: 'rentalCheckout', label: 'Rental Start', description: 'When vehicle is delivered to you', hasInApp: true, hasEmail: false },
        { key: 'rentalCompletion', label: 'Rental Completion', description: 'When you return a vehicle', hasInApp: true, hasEmail: false },
        { key: 'rentalCancellation', label: 'Rental Cancellation', description: 'When a rental is cancelled', hasInApp: true, hasEmail: false },
        { key: 'rentalExtension', label: 'Rental Extension', description: 'When rental period is extended', hasInApp: true, hasEmail: false }
      ]
    },
    {
      category: 'Alert Notifications',
      types: [
        { key: 'overdueAlert', label: 'Overdue Alert', description: 'When rental becomes overdue', hasInApp: true, hasEmail: false }
      ]
    },
    {
      category: 'Payment Notifications',
      types: [
        { key: 'paymentVerified', label: 'Payment Verified', description: 'When your payment is approved by admin', hasInApp: true, hasEmail: false },
        { key: 'paymentRejected', label: 'Payment Rejected', description: 'When your payment is rejected by admin', hasInApp: true, hasEmail: false }
      ]
    }
  ];
  
  // Add customer-only refund notification
  if (req.user.role !== 'admin') {
    types.push({
      category: 'Refund Notifications',
      types: [
        { key: 'refundProcessed', label: 'Refund Processed', description: 'When your refund has been processed', hasInApp: true, hasEmail: false }
      ]
    });
  }
  
  // Add admin-only types if user is admin
  if (req.user.role === 'admin') {
    types.push({
      category: 'Admin-Only Notifications',
      types: [
        { key: 'newBookingAlert', label: 'New Booking Alert', description: 'When customers create new bookings', hasInApp: true, hasEmail: false },
        { key: 'maintenanceAlert', label: 'Maintenance Alert', description: 'Vehicle maintenance reminders', hasInApp: true, hasEmail: false },
        { key: 'refundRequest', label: 'Refund Request', description: 'When a customer requests a refund', hasInApp: true, hasEmail: false }
      ]
    });
  }
  
  res.json({
    success: true,
    data: types
  });
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettings,
  getNotificationTypes
};

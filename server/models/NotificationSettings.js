const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Global notification preferences
  enableInApp: {
    type: Boolean,
    default: true,
    description: 'Enable/disable all in-app notifications'
  },
  
  enableEmail: {
    type: Boolean,
    default: true,
    description: 'Enable/disable all email notifications'
  },
  
  // Per-type notification preferences
  preferences: {
    // Booking notifications
    bookingConfirmation: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    bookingReminder: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    bookingCancellation: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    
    // Rental notifications
    rentalCheckout: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    rentalCompletion: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    rentalCancellation: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    rentalExtension: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    
    // Alert notifications
    overdueAlert: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    
    // Payment notifications
    paymentVerified: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    paymentRejected: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    
    // Refund notifications
    refundRequest: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    refundProcessed: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    
    // Admin-only notifications
    maintenanceAlert: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    newBookingAlert: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false } // Default off for admins
    }
  },
  
  // Quiet hours (optional feature)
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: '22:00' }, // 10 PM
    endTime: { type: String, default: '08:00' }    // 8 AM
  }
}, {
  timestamps: true
});

// Method to check if notification should be sent
notificationSettingsSchema.methods.shouldSendNotification = function(notificationType, deliveryMethod) {
  // Check global settings first
  if (deliveryMethod === 'inApp' && !this.enableInApp) {
    return false;
  }
  if (deliveryMethod === 'email' && !this.enableEmail) {
    return false;
  }
  
  // Check specific notification type preference
  const typePreference = this.preferences[notificationType];
  if (!typePreference) {
    return true; // Default to true if type not found
  }
  
  return typePreference[deliveryMethod];
};

// Method to check if currently in quiet hours
notificationSettingsSchema.methods.isQuietHours = function() {
  if (!this.quietHours.enabled) {
    return false;
  }
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const start = this.quietHours.startTime;
  const end = this.quietHours.endTime;
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }
  
  return currentTime >= start && currentTime <= end;
};

// Static method to get or create settings for a user
notificationSettingsSchema.statics.getOrCreate = async function(userId) {
  let settings = await this.findOne({ userId });
  
  if (!settings) {
    settings = await this.create({ userId });
  }
  
  return settings;
};

const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);

module.exports = NotificationSettings;

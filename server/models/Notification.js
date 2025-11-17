const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      // Booking notifications
      'bookingConfirmation',
      'bookingReminder', 
      'bookingCancellation',
      'bookingRejection',
      // Rental notifications
      'rentalCheckout',
      'rentalCompletion',
      'rentalCancellation',
      'rentalExtension',
      // Alert notifications
      'overdueAlert',
      // Payment notifications
      'paymentVerified',
      'paymentRejected',
      // Refund notifications
      'refundRequest',
      'refundProcessed',
      // Admin notifications
      'maintenanceAlert',
      'newBookingAlert',
      // Maintenance notifications
      'maintenance_completed',
      'maintenance_updated',
      'maintenance_assigned',
      // Legacy/System
      'booking_confirmation',
      'booking_reminder',
      'rental_status',
      'rental_extension',
      'overdue_alert',
      'maintenance_alert',
      'system'
    ],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: false
  },
  subject: {
    type: String,
    required: false
  },
  seen: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    required: false
  },
  // Generic related fields (newer approach)
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  relatedModel: {
    type: String,
    enum: ['Booking', 'Rental', 'Payment', 'Car', 'User'],
    required: false
  },
  // Legacy specific fields (for backward compatibility)
  relatedBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false
  },
  relatedRentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isAdminCopy: {
    type: Boolean,
    default: false
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ userId: 1, seen: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { emitToUser } = require('../socket/socketServer');
const { sendEmailNotification } = require('./notificationController');
const { getRefundPolicyDescription } = require('../config/refundPolicy');

// Helper function to emit notification via WebSocket
const emitNotificationViaWebSocket = (userId, notification) => {
  try {
    emitToUser(userId.toString(), 'newNotification', {
      notification: notification.toObject ? notification.toObject() : notification,
      unreadCount: null
    });
  } catch (socketError) {
    console.error('Error emitting notification via WebSocket:', socketError);
  }
};

/**
 * Get all pending refunds (Admin only)
 */
exports.getPendingRefunds = async (req, res) => {
  try {
    const pendingRefunds = await Payment.find({ refundStatus: 'pending' })
      .populate('user', 'email profile.firstName profile.lastName')
      .populate({
        path: 'booking',
        populate: [
          { path: 'car', select: 'make model year' },
          { path: 'user', select: 'email profile.firstName profile.lastName' }
        ]
      })
      .sort({ refundRequestedAt: -1 });

    res.status(200).json({
      success: true,
      data: pendingRefunds,
      count: pendingRefunds.length
    });
  } catch (error) {
    console.error('Error fetching pending refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending refunds',
      error: error.message
    });
  }
};

/**
 * Get all processed refunds (Admin only)
 */
exports.getProcessedRefunds = async (req, res) => {
  try {
    const processedRefunds = await Payment.find({ refundStatus: 'processed' })
      .populate('user', 'email profile.firstName profile.lastName')
      .populate({
        path: 'booking',
        populate: [
          { path: 'car', select: 'make model year' },
          { path: 'user', select: 'email profile.firstName profile.lastName' }
        ]
      })
      .populate('refundProcessedBy', 'email profile.firstName profile.lastName')
      .sort({ refundDate: -1 });

    res.status(200).json({
      success: true,
      data: processedRefunds,
      count: processedRefunds.length
    });
  } catch (error) {
    console.error('Error fetching processed refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching processed refunds',
      error: error.message
    });
  }
};

/**
 * Get refund statistics (Admin only)
 */
exports.getRefundStatistics = async (req, res) => {
  try {
    const pendingCount = await Payment.countDocuments({ refundStatus: 'pending' });
    const processedCount = await Payment.countDocuments({ refundStatus: 'processed' });
    
    const pendingAmount = await Payment.aggregate([
      { $match: { refundStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } }
    ]);

    const processedAmount = await Payment.aggregate([
      { $match: { refundStatus: 'processed' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        pending: {
          count: pendingCount,
          totalAmount: pendingAmount.length > 0 ? pendingAmount[0].total : 0
        },
        processed: {
          count: processedCount,
          totalAmount: processedAmount.length > 0 ? processedAmount[0].total : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching refund statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching refund statistics',
      error: error.message
    });
  }
};

/**
 * Process a refund (Admin only)
 */
exports.processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { refundNotes } = req.body;
    const adminId = req.user._id;

    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'booking',
        populate: {
          path: 'car user'
        }
      })
      .populate('user');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.refundStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Refund is already ${payment.refundStatus}`
      });
    }

    // Update payment with refund processed details
    payment.refundStatus = 'processed';
    payment.refundDate = new Date();
    payment.refundProcessedBy = adminId;
    if (refundNotes) {
      payment.refundNotes = `${payment.refundNotes || ''}\n\nAdmin Notes: ${refundNotes}`.trim();
    }
    await payment.save();

    // Update booking payment status to refunded
    if (payment.booking) {
      await Booking.findByIdAndUpdate(payment.booking._id, {
        paymentStatus: 'refunded'
      });
    }

    // Send in-app notification to customer (no email)
    const notificationMessage = `Your refund has been processed successfully!

Booking ID: ${payment.booking?.bookingId || payment.booking?._id}
Refund Amount: ₱${payment.refundAmount?.toLocaleString()}
Refund Method: ${payment.refundMethod?.toUpperCase()}

The refund will be credited to your ${payment.refundMethod?.toUpperCase()} account within 3-5 business days.

Thank you for your patience!`;

    // Create in-app notification only
    const refundNotif = await Notification.create({
      userId: payment.user._id,
      type: 'refundProcessed',
      title: 'Refund Processed',
      subject: 'Refund Processed',
      message: notificationMessage,
      relatedBookingId: payment.booking?._id
    });
    emitNotificationViaWebSocket(payment.user._id, refundNotif);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
};

/**
 * Get refund policy
 */
exports.getRefundPolicy = async (req, res) => {
  try {
    const policy = getRefundPolicyDescription();
    
    res.status(200).json({
      success: true,
      data: {
        policy,
        rules: [
          { hoursBeforePickup: 24, refundPercentage: 100, description: 'Full refund' },
          { hoursBeforePickup: 12, refundPercentage: 50, description: 'Partial refund' },
          { hoursBeforePickup: 0, refundPercentage: 0, description: 'No refund' }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching refund policy:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching refund policy',
      error: error.message
    });
  }
};

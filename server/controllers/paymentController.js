const Payment = require('../models/Payment');
const PaymentSettings = require('../models/PaymentSettings');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { emitToUser } = require('../socket/socketServer');
const { sendEmailNotification } = require('./notificationController');

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

// Get payment settings (public)
const getPaymentSettings = async (req, res) => {
  try {
    let settings = await PaymentSettings.findById('payment_settings');
    
    // Create default settings if none exist
    if (!settings) {
      settings = await PaymentSettings.create({ _id: 'payment_settings' });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    res.status(500).json({ message: 'Error fetching payment settings' });
  }
};

// Update payment settings (admin only)
const updatePaymentSettings = async (req, res) => {
  try {
    const updates = req.body;
    
    // Parse enabledMethods if it's a JSON string
    if (updates.enabledMethods && typeof updates.enabledMethods === 'string') {
      try {
        updates.enabledMethods = JSON.parse(updates.enabledMethods);
      } catch (e) {
        console.error('Error parsing enabledMethods:', e);
      }
    }
    
    // Handle file uploads if any
    if (req.files) {
      if (req.files.gcashQRCode) {
        updates.gcashQRCode = req.files.gcashQRCode[0].path;
      }
      if (req.files.paymayaQRCode) {
        updates.paymayaQRCode = req.files.paymayaQRCode[0].path;
      }
    }
    
    const settings = await PaymentSettings.findByIdAndUpdate(
      'payment_settings',
      updates,
      { new: true, upsert: true }
    );
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({ message: 'Error updating payment settings' });
  }
};

// Create payment (customer)
const createPayment = async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, referenceNumber, notes } = req.body;
    
    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Handle payment proof upload
    let paymentProof = null;
    if (req.file) {
      // For Cloudinary, req.file.path is the full URL
      // For local storage, req.file.path is the relative path (e.g., 'uploads/filename.jpg')
      paymentProof = req.file.path;
    }
    
    // All payments start as pending - admin must verify car availability first
    const isCashPayment = paymentMethod === 'cash';
    
    const payment = await Payment.create({
      booking: bookingId,
      user: req.user._id,
      amount,
      paymentMethod,
      paymentProof,
      referenceNumber,
      notes,
      status: 'pending', // All payments pending until admin confirms
      verifiedAt: null,
      verifiedBy: null
    });
    
    // Update booking payment status - all start as pending
    booking.paymentStatus = 'pending';
    await booking.save();
    
    // Notify admin about payment
    try {
      const { broadcastToAdmins } = require('./notificationController');
      
      if (isCashPayment) {
        // Cash payment - notify admin with comprehensive booking + payment details
        const customerName = req.user.profile ? `${req.user.profile.firstName} ${req.user.profile.lastName}` : req.user.email;
        const adminMessage = `NEW BOOKING - CASH ON DELIVERY\n\n` +
          `CUSTOMER INFORMATION\n` +
          `Customer: ${customerName}\n` +
          `Email: ${req.user.email}\n` +
          `Phone: ${req.user.phone || req.user.profile?.phone || 'N/A'}\n\n` +
          `BOOKING DETAILS\n` +
          `Booking ID: ${booking.bookingId || booking._id}\n` +
          `Status: PENDING (Awaiting Confirmation)\n` +
          `Created: ${new Date().toLocaleString()}\n\n` +
          `VEHICLE INFORMATION\n` +
          `Vehicle: ${booking.car?.year || ''} ${booking.car?.make || ''} ${booking.car?.model || ''}\n` +
          `Daily Rate: ₱${booking.car?.pricePerDay?.toLocaleString() || amount.toLocaleString()}\n\n` +
          `RENTAL PERIOD\n` +
          `Delivery Date: ${new Date(booking.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
          `Return Date: ${new Date(booking.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
          `Location: ${booking.location || 'N/A'}\n\n` +
          `PAYMENT DETAILS\n` +
          `Payment Method: Cash on Delivery\n` +
          `Total Amount: ₱${amount.toLocaleString()}\n` +
          `Payment Status: PENDING\n\n` +
          `⚠️ ACTION REQUIRED:\n` +
          `1. Verify vehicle availability for the requested dates\n` +
          `2. Go to Payment Verification page\n` +
          `3. Approve the booking if vehicle is available\n` +
          `4. Prepare vehicle for delivery once approved\n` +
          `5. Collect ₱${amount.toLocaleString()} in cash at delivery\n\n` +
          `Note: Customer is waiting for confirmation. Payment will be collected at delivery.`;
        
        await broadcastToAdmins({
          type: 'newBookingAlert',
          subject: 'Cash Payment - Awaiting Confirmation',
          message: adminMessage,
          priority: 'high',
          isAdminCopy: true,
          relatedBookingId: booking._id
        });
      } else {
        // Online payment - notify admin with comprehensive booking + payment details
        const customerName = req.user.profile ? `${req.user.profile.firstName} ${req.user.profile.lastName}` : req.user.email;
        const adminMessage = `NEW BOOKING - ${paymentMethod.toUpperCase()} PAYMENT\n\n` +
          `CUSTOMER INFORMATION\n` +
          `Customer: ${customerName}\n` +
          `Email: ${req.user.email}\n` +
          `Phone: ${req.user.phone || req.user.profile?.phone || 'N/A'}\n\n` +
          `BOOKING DETAILS\n` +
          `Booking ID: ${booking.bookingId || booking._id}\n` +
          `Status: PENDING (Awaiting Payment Verification)\n` +
          `Created: ${new Date().toLocaleString()}\n\n` +
          `VEHICLE INFORMATION\n` +
          `Vehicle: ${booking.car?.year || ''} ${booking.car?.make || ''} ${booking.car?.model || ''}\n` +
          `Daily Rate: ₱${booking.car?.pricePerDay?.toLocaleString() || amount.toLocaleString()}\n\n` +
          `RENTAL PERIOD\n` +
          `Delivery Date: ${new Date(booking.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
          `Return Date: ${new Date(booking.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
          `Location: ${booking.location || 'N/A'}\n\n` +
          `PAYMENT DETAILS\n` +
          `Payment Method: ${paymentMethod.toUpperCase()}\n` +
          `Reference Number: ${referenceNumber || 'Not provided'}\n` +
          `Total Amount: ₱${amount.toLocaleString()}\n` +
          `Payment Status: PENDING VERIFICATION\n\n` +
          `⚠️ ACTION REQUIRED:\n` +
          `1. Go to Payment Verification page\n` +
          `2. Review payment proof screenshot\n` +
          `3. Verify or reject the payment\n\n` +
          `Note: Customer is waiting for payment verification to confirm their booking.`;
        
        await broadcastToAdmins({
          type: 'newBookingAlert',
          subject: 'New Payment Awaiting Verification',
          message: adminMessage,
          priority: 'high',
          isAdminCopy: true,
          relatedBookingId: booking._id
        });
      }
    } catch (adminNotifError) {
      console.error('Error sending admin notification:', adminNotifError);
      // Don't fail payment creation if admin notification fails
    }
    
    // Emit real-time update to admins
    try {
      const { emitToAdmins } = require('../socket/socketServer');
      emitToAdmins('newPayment', {
        payment: {
          _id: payment._id,
          booking: booking._id,
          bookingId: booking.bookingId,
          user: {
            _id: req.user._id,
            email: req.user.email,
            profile: req.user.profile
          },
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          createdAt: payment.createdAt
        }
      });
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }
    
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Error creating payment' });
  }
};

// Get payment by booking ID
const getPaymentByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const payment = await Payment.findOne({ booking: bookingId })
      .populate('user', 'email profile.firstName profile.lastName')
      .populate('verifiedBy', 'email profile.firstName profile.lastName');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Check authorization
    if (req.user.role !== 'admin' && payment.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Error fetching payment' });
  }
};

// Get all payments (admin only)
const getAllPayments = async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    const payments = await Payment.find(filter)
      .populate('user', 'email profile.firstName profile.lastName')
      .populate('booking')
      .populate('verifiedBy', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
};

// Verify payment (admin only)
const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, rejectionReason } = req.body;
    
    const payment = await Payment.findById(paymentId).populate('booking user');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    payment.status = status;
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    
    if (status === 'rejected') {
      payment.rejectionReason = rejectionReason;
    }
    
    await payment.save();
    
    // Update booking payment status and booking status
    const booking = await Booking.findById(payment.booking._id).populate('car');
    if (booking) {
      booking.paymentStatus = status === 'verified' ? 'paid' : 'pending';
      // Update booking status to confirmed when payment is verified
      if (status === 'verified') {
        booking.status = 'confirmed';
      }
      await booking.save();
    }

    // Emit real-time update to customer IMMEDIATELY (before response)
    try {
      const { emitToUser } = require('../socket/socketServer');
      emitToUser(payment.user._id.toString(), 'paymentStatusUpdate', {
        paymentId: payment._id,
        status: payment.status,
        bookingId: payment.booking._id,
        message: status === 'verified' 
          ? 'Your payment has been verified! Your booking is now confirmed.'
          : `Your payment was rejected. Reason: ${rejectionReason}`
      });
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    // Send response immediately for fast UI feedback
    res.json(payment);

    // Handle notifications asynchronously (don't block response)
    setImmediate(async () => {
      try {
        // Create combined payment verification + booking confirmation notification
        try {
          const notificationType = status === 'verified' ? 'paymentVerified' : 'paymentRejected';
          
          let notificationMessage;
          if (status === 'verified' && booking) {
            // Combined message with payment AND booking details
            notificationMessage = `PAYMENT VERIFIED & BOOKING CONFIRMED!\n\n` +
              `PAYMENT DETAILS:\n` +
              `• Amount Paid: ₱${payment.amount.toLocaleString()}\n` +
              `• Payment Status: Verified ✓\n\n` +
              `BOOKING DETAILS:\n` +
              `• Car: ${booking.car?.make} ${booking.car?.model}\n` +
              `• Delivery Date: ${new Date(booking.startDate).toLocaleDateString()}\n` +
              `• Return Date: ${new Date(booking.endDate).toLocaleDateString()}\n` +
              `• Delivery Location: ${booking.location || 'To be confirmed'}\n` +
              `• Total Amount: ₱${booking.totalPrice?.toLocaleString()}\n\n` +
              `Your payment has been verified and your booking is now confirmed. ` +
              `We look forward to serving you!`;
          } else {
            notificationMessage = `Your payment verification failed. Reason: ${rejectionReason}. Please submit a new payment.`;
          }

          const paymentNotif = await Notification.create({
            userId: payment.user._id,
            type: notificationType,
            title: status === 'verified' ? 'Payment Verified & Booking Confirmed' : 'Payment Verification Failed',
            message: notificationMessage,
            relatedId: payment._id,
            relatedModel: 'Payment'
          });
          emitNotificationViaWebSocket(payment.user._id, paymentNotif);
        } catch (notifError) {
          console.error('❌ Error creating notification:', notifError);
        }

        // Send email notification with template
        try {
          const fs = require('fs').promises;
          const path = require('path');

          const templateName = status === 'verified' ? 'paymentVerification' : 'paymentRejection';
          const templatePath = path.join(__dirname, '../utils/emailTemplates', `${templateName}.html`);
          let emailContent = await fs.readFile(templatePath, 'utf8');

          // Get user name
          const userName = payment.user.profile ? 
            `${payment.user.profile.firstName} ${payment.user.profile.lastName}` : 
            'Valued Customer';

          // Replace placeholders
          emailContent = emailContent.replace('{{userName}}', userName);
          emailContent = emailContent.replace('{{amount}}', `₱${payment.amount.toLocaleString()}`);
          emailContent = emailContent.replace('{{paymentMethod}}', payment.method || 'Bank Transfer');
          emailContent = emailContent.replace('{{bookingId}}', booking.bookingId || booking._id);
          emailContent = emailContent.replace('{{verifiedDate}}', new Date().toLocaleDateString());

          if (status === 'rejected') {
            emailContent = emailContent.replace('{{rejectionReason}}', rejectionReason || 'Not specified');
          }

          const message = status === 'verified'
            ? `Your payment of ₱${payment.amount.toLocaleString()} has been verified. Your booking is now confirmed!`
            : `Your payment verification failed. Reason: ${rejectionReason}. Please submit a new payment.`;

          emailContent = emailContent.replace('{{message}}', message);

          const subject = status === 'verified' 
            ? 'Payment Verified - Booking Confirmed'
            : 'Payment Verification Failed';

          await sendEmailNotification(payment.user._id, subject, emailContent, null);
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      } catch (asyncError) {
        console.error('Error in async notification handling:', asyncError);
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

module.exports = {
  getPaymentSettings,
  updatePaymentSettings,
  createPayment,
  getPaymentByBooking,
  getAllPayments,
  verifyPayment
};

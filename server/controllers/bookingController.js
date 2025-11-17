const Booking = require('../models/Booking');
const Car = require('../models/Car');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { emitToUser } = require('../socket/socketServer');
const { sendBookingConfirmation, broadcastToAdmins } = require('./notificationController');
const { isValidBookingDate, getBookingRestrictionMessage } = require('../config/rentalConfig');
const { calculateRefundAmount } = require('../config/refundPolicy');

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

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { user, car, startDate, endDate } = req.body;
    
    // Validate input
    if (!user || !car || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: user, car, startDate, endDate' 
      });
    }
    
    // Validate booking date against operating hours rule
    if (!isValidBookingDate(startDate)) {
      return res.status(400).json({ 
        success: false, 
        message: getBookingRestrictionMessage()
      });
    }
    
    // Check if car exists
    const carExists = await Car.findById(car);
    if (!carExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Car not found' 
      });
    }
    
    // Check if user exists
    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if user has set their location
    if (!userExists.profile?.address || !userExists.profile?.address.trim()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please set your location in your profile before booking a car.' 
      });
    }
    
    // Check if car is available for the selected dates
    const existingBookings = await Booking.find({
      car: car,
      status: { $in: ['pending', 'confirmed', 'rented', 'active'] },
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ]
    });
    
    if (existingBookings.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Car is not available for the selected dates' 
      });
    }
    
    // Calculate total price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalPrice = diffDays * carExists.pricePerDay;
    
    // Create booking with customer's profile location as pickup location
    const booking = new Booking({
      user,
      car,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalPrice,
      location: userExists.profile.address, // Use customer's profile address as pickup location
      latitude: userExists.profile.latitude, // Save precise coordinates from location picker
      longitude: userExists.profile.longitude, // Save precise coordinates from location picker
      pickupLocation: userExists.profile.address, // Also set pickupLocation for consistency
    });
    
    await booking.save();
    
    // NO customer notification on booking creation - they see it on the booking page
    // Customer will get notification when admin CONFIRMS the booking
    
    // Send new booking alert to admins
    try {
      const populatedBooking = await Booking.findById(booking._id)
        .populate('user', 'email profile.firstName profile.lastName phone')
        .populate('car', 'make model year pricePerDay');
      
      // Calculate rental duration
      const start = new Date(startDate);
      const end = new Date(endDate);
      const rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      // Use pre-formatted bookingId from model or fallback to formatting _id
      const bookingIdFormatted = booking.bookingId || `BKG-${booking._id.toString().slice(-5).toUpperCase()}`;
      
      // NOTE: Admin notification is now sent from paymentController.js
      // This includes both booking AND payment details in one comprehensive notification
      // Removed redundant booking-only notification to reduce admin notification clutter
      
      /* REMOVED - Admin gets notification when payment is submitted instead
      const adminMessage = `NEW BOOKING ALERT\n\n` +
        `CUSTOMER INFORMATION\n` +
        `Customer: ${userExists.profile?.firstName || ''} ${userExists.profile?.lastName || ''}\n` +
        `Email: ${userExists.email}\n` +
        `Phone: ${userExists.phone || userExists.profile?.phone || 'N/A'}\n\n` +
        `BOOKING DETAILS\n` +
        `Booking ID: ${bookingIdFormatted}\n` +
        `Status: PENDING (Requires Confirmation)\n` +
        `Created: ${new Date().toLocaleString()}\n\n` +
        `VEHICLE INFORMATION\n` +
        `Vehicle: ${carExists.year} ${carExists.make} ${carExists.model}\n` +
        `Daily Rate: PHP ${carExists.pricePerDay.toLocaleString()}\n` +
        `Fuel Type: ${carExists.fuelType || 'Gas'}\n` +
        `Transmission: ${carExists.transmission || 'Automatic'}\n` +
        `Seats: ${carExists.seats || '5'}\n` +
        `Body Type: ${carExists.bodyType || 'Sedan'}\n\n` +
        `RENTAL PERIOD\n` +
        `Delivery Date: ${new Date(startDate).toLocaleDateString('en-US', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        })}\n` +
        `Return Date: ${new Date(endDate).toLocaleDateString('en-US', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        })}\n` +
        `Duration: ${rentalDays} day(s)\n` +
        `Location: ${location}\n\n` +
        `FINANCIAL SUMMARY\n` +
        `Daily Rate: PHP ${carExists.pricePerDay.toLocaleString()}\n` +
        `Number of Days: ${rentalDays}\n` +
        `Total Amount: PHP ${totalPrice.toLocaleString()}\n` +
        `Payment Status: Pending\n\n` +
        `ACTION REQUIRED\n` +
        `1. Review booking details\n` +
        `2. Verify vehicle availability\n` +
        `3. Confirm or reject the booking\n` +
        `4. Prepare vehicle for delivery if confirmed\n\n` +
        `Note: Customer will be notified once you confirm this booking.`;
      
      await broadcastToAdmins({
        type: 'booking_confirmation',
        subject: 'New Booking Received',
        message: adminMessage,
        priority: 'medium',
        isAdminCopy: true,
        relatedBookingId: booking._id
      });
      console.log('New booking alert sent to admins');
      */
    } catch (adminNotifError) {
      console.error('Error sending admin notification:', adminNotifError);
      // Don't fail the booking if admin notification fails
    }
    
    // Emit real-time update to admins
    try {
      const { emitToAdmins } = require('../socket/socketServer');
      emitToAdmins('newBooking', {
        booking: {
          _id: booking._id,
          bookingId: booking.bookingId,
          user: req.user,
          car: carExists,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalPrice: booking.totalPrice,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          createdAt: booking.createdAt
        }
      });
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message,
    });
  }
};

// Get all bookings for a user
exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const bookings = await Booking.find({ user: userId })
      .populate('car', 'make model year pricePerDay imageUrls seats luggageCapacity bodyType trim fuelType transmission location geolocation')
      .populate('user', 'email profile.firstName profile.lastName profile.profilePicture phone')
      .sort({ createdAt: -1 }); // Newest first
    
    // Transform bookings to include pickupLocation
    const transformedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      return {
        ...bookingObj,
        pickupLocation: booking.location || 'Main Office', // Map location to pickupLocation
        returnLocation: booking.car?.location || 'Main Office', // Car's location for return
        paymentStatus: booking.paymentStatus || 'pending', // Explicitly include paymentStatus
        latitude: booking.latitude, // Include coordinates for precise mapping
        longitude: booking.longitude, // Include coordinates for precise mapping
      };
    });
    
    res.status(200).json({
      success: true,
      count: transformedBookings.length,
      data: transformedBookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user bookings',
      error: error.message,
    });
  }
};

// Get all bookings (admin only)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('car', 'make model year pricePerDay imageUrls seats luggageCapacity bodyType trim fuelType transmission location geolocation')
      .populate('user', 'email profile.firstName profile.lastName profile.profilePicture profile.address profile.latitude profile.longitude phone')
      .sort({ createdAt: -1 }); // Newest first
    
    // Transform bookings to include pickupLocation
    const transformedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      return {
        ...bookingObj,
        pickupLocation: booking.location || 'Main Office', // Map location to pickupLocation
        returnLocation: booking.car?.location || 'Main Office', // Car's location for return
        paymentStatus: booking.paymentStatus || 'pending', // Explicitly include paymentStatus
        latitude: booking.latitude, // Include coordinates for precise mapping
        longitude: booking.longitude, // Include coordinates for precise mapping
      };
    });
    
    res.status(200).json({
      success: true,
      count: transformedBookings.length,
      data: transformedBookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message,
    });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id)
      .populate('car', 'make model year pricePerDay imageUrls licensePlate fuelType transmission category features seats luggageCapacity bodyType trim location geolocation')
      .populate('user', 'email firstName lastName name profile phone');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    
    // Fetch payment information for this booking
    const payment = await Payment.findOne({ booking: id });
    
    // Transform the booking data to match frontend expectations
    const transformedBooking = {
      ...booking.toObject(),
      totalAmount: booking.totalPrice, // Add totalAmount field
      pickupLocation: booking.location, // Customer's delivery address
      returnLocation: booking.car?.location || 'Main Office', // Car's location for return
      paymentStatus: booking.paymentStatus || 'pending', // Default payment status
      paymentMethod: payment?.paymentMethod || null, // Add payment method from payment record
      latitude: booking.latitude, // Include coordinates for precise mapping
      longitude: booking.longitude, // Include coordinates for precise mapping
    };
    
    res.status(200).json({
      success: true,
      data: transformedBooking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message,
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Get the booking before update to check previous status
    const previousBooking = await Booking.findById(id).populate('car').populate('user');
    if (!previousBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    
    // CRITICAL FIX: If confirming a booking, check if the car is available
    if (status === 'confirmed' && previousBooking.status !== 'confirmed') {
      const Rental = require('../models/Rental');
      
      // Check if the car has any active rentals
      const activeRental = await Rental.findOne({
        car: previousBooking.car._id,
        rentalStatus: 'active'
      });
      
      if (activeRental) {
        return res.status(400).json({
          success: false,
          message: 'Cannot confirm this booking. The car is currently rented out and not available.',
        });
      }
      
      // Check for other overlapping confirmed bookings
      const overlappingBookings = await Booking.find({
        car: previousBooking.car._id,
        _id: { $ne: id }, // Exclude current booking
        status: { $in: ['confirmed', 'active'] },
        $or: [
          {
            startDate: { $lte: previousBooking.endDate },
            endDate: { $gte: previousBooking.startDate }
          }
        ]
      });
      
      if (overlappingBookings.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot confirm this booking. The car has other confirmed bookings during this period.',
        });
      }
    }
    
    // Prepare update object
    const updateData = { status };
    
    // Update payment status based on booking status
    if (status === 'completed') {
      // When booking is completed, mark payment as paid
      updateData.paymentStatus = 'paid';
    } else if (status === 'cancelled') {
      // When booking is cancelled by admin, trigger refund logic
      // Get payment and create refund request
      const Payment = require('../models/Payment');
      const { calculateRefundAmount } = require('../config/refundPolicy');
      const { broadcastToAdmins } = require('./notificationController');
      
      const payment = await Payment.findOne({ booking: id });
      
      if (payment && payment.status === 'verified') {
          // Calculate refund
          const refundCalculation = calculateRefundAmount(
            payment.amount,
            previousBooking.startDate,
            new Date(),
            payment.paymentMethod,
            payment.status
          );
          
          // If refund is required, create refund request
          if (refundCalculation.requiresRefund && refundCalculation.refundAmount > 0) {
            payment.refundStatus = 'pending';
            payment.refundAmount = refundCalculation.refundAmount;
            payment.refundMethod = payment.paymentMethod === 'cash' ? 'cash' : payment.paymentMethod;
            payment.refundRequestedAt = new Date();
            payment.refundNotes = `Admin cancelled booking. ${refundCalculation.reason}`;
            await payment.save();
            
            // Notify admins about refund request
            const customerName = previousBooking.user.profile?.firstName && previousBooking.user.profile?.lastName
              ? `${previousBooking.user.profile.firstName} ${previousBooking.user.profile.lastName}`
              : previousBooking.user.email;
            
            await broadcastToAdmins({
              type: 'refundRequest',
              title: 'Refund Request - Admin Cancelled Booking',
              subject: 'Refund Request - Admin Cancelled Booking',
              message: `REFUND REQUEST

Booking ID: ${previousBooking.bookingId || previousBooking._id}
Customer: ${customerName}
Amount to Refund: ₱${refundCalculation.refundAmount?.toLocaleString()}
Refund Percentage: ${refundCalculation.refundPercentage}%
Payment Method: ${payment.paymentMethod.toUpperCase()}

Reason: ${refundCalculation.reason}
Hours Until Pickup: ${refundCalculation.hoursUntilPickup}

Cancelled by: Admin

ACTION REQUIRED:
1. Go to Refund Management page
2. Process the refund via ${payment.paymentMethod.toUpperCase()}
3. Mark as processed once completed

Note: Customer is waiting for refund processing.`,
              priority: 'high',
              relatedBookingId: previousBooking._id
            });
          }
        }
    }
    
    let booking = await Booking.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Re-fetch with populated references so frontend has car & user info
    booking = await Booking.findById(booking._id)
      .populate('car', 'make model year pricePerDay imageUrls seats luggageCapacity bodyType trim fuelType transmission')
      .populate('user', 'email profile.firstName profile.lastName profile.phone');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    
    // Send notification when booking is confirmed (async - don't wait)
    if (status === 'confirmed' && previousBooking.status !== 'confirmed') {
      // Send notification asynchronously - don't wait for it
      setImmediate(async () => {
        try {
          const { sendBookingConfirmation } = require('./notificationController');
          
          // Get user name
          const userName = booking.user.profile ? 
            `${booking.user.profile.firstName} ${booking.user.profile.lastName}` : 
            'Valued Customer';
          
          // Format booking details for notification
          const bookingDetails = `
Great news! Your booking has been confirmed!

Booking Details:
• Booking ID: ${booking.bookingId || `BKG-${booking._id.toString().slice(-5).toUpperCase()}`}
• Vehicle: ${booking.car.make} ${booking.car.model} ${booking.car.year}
• Delivery Date: ${new Date(booking.startDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
• Return Date: ${new Date(booking.endDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
• Delivery Location: ${booking.location}
• Total Price: PHP ${booking.totalPrice.toFixed(2)}

Please have the following ready on delivery day:
• Valid driver's license
• Government-issued ID
• Proof of insurance (if applicable)
• This booking confirmation

Thank you for choosing our car rental service! We look forward to serving you.

Safe travels!`;

          await sendBookingConfirmation(
            booking.user._id || booking.user,
            booking._id,
            bookingDetails,
            userName
          );
          
          console.log(`✅ Booking confirmation notification sent for booking ${booking._id}`);
        } catch (notificationError) {
          // Log error but don't fail the status update
          console.error('Failed to send booking confirmation notification:', notificationError);
        }
      });
    }
    
    // Send cancellation notifications if booking was cancelled (async - don't wait)
    if (status === 'cancelled' && previousBooking.status !== 'cancelled') {
      setImmediate(async () => {
        try {
          const Notification = require('../models/Notification');
        
        // Use pre-formatted bookingId from model or fallback to formatting _id
        const bookingIdFormatted = booking.bookingId || `BKG-${booking._id.toString().slice(-5).toUpperCase()}`;
        
        // Send notification to customer
        const customerMessage = `Your booking has been cancelled.\n\n` +
          `BOOKING DETAILS\n` +
          `Booking ID: ${bookingIdFormatted}\n` +
          `Status: CANCELLED\n` +
          `Cancellation Date: ${new Date().toLocaleString()}\n\n` +
          `VEHICLE INFORMATION\n` +
          `Vehicle: ${booking.car.year} ${booking.car.make} ${booking.car.model}\n` +
          `Daily Rate: PHP ${booking.car.pricePerDay?.toLocaleString() || 'N/A'}\n` +
          `Fuel Type: ${booking.car.fuelType || 'Gas'}\n` +
          `Transmission: ${booking.car.transmission || 'Automatic'}\n\n` +
          `ORIGINAL RENTAL PERIOD\n` +
          `Delivery Date: ${new Date(booking.startDate).toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}\n` +
          `Return Date: ${new Date(booking.endDate).toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}\n` +
          `Delivery Location: ${booking.location}\n\n` +
          `• Feel free to make a new booking anytime\n\n` +
          `We apologize for any inconvenience and hope to serve you in the future.`;
        
        const cancelNotif = await Notification.create({
          userId: booking.user._id || booking.user,
          type: 'booking_confirmation', // Using booking_confirmation type for cancellation
          subject: 'Booking Cancelled',
          message: customerMessage,
          relatedBookingId: booking._id,
          priority: 'high',
          seen: false
        });
        emitNotificationViaWebSocket(booking.user._id || booking.user, cancelNotif);
        
        // Send email notification to customer
        try {
          const { sendEmailNotification } = require('./notificationController');
          await sendEmailNotification(
            booking.user._id || booking.user,
            'Booking Cancellation - Car Rental System',
            customerMessage,
            'bookingCancellation'
          );
          console.log(`Booking cancellation email sent to customer for booking ${booking._id}`);
        } catch (emailError) {
          console.error('Failed to send booking cancellation email:', emailError);
        }
        
        // Send notification to admins
        const adminMessage = `BOOKING CANCELLATION ALERT\n\n` +
          `Customer: ${booking.user.profile?.firstName || ''} ${booking.user.profile?.lastName || ''}\n` +
          `Email: ${booking.user.email}\n` +
          `Phone: ${booking.user.profile?.phone || 'N/A'}\n\n` +
          `Cancelled Booking:\n` +
          `• Vehicle: ${booking.car.year} ${booking.car.make} ${booking.car.model}\n` +
          `• Dates: ${booking.startDate.toLocaleDateString()} - ${booking.endDate.toLocaleDateString()}\n` +
          `• Cancellation Date: ${new Date().toLocaleDateString()}\n` +
          `• Refund Amount: PHP ${booking.totalPrice.toLocaleString()}\n\n` +
          `Vehicle is now available for other bookings.`;
        
        await broadcastToAdmins({
          type: 'booking_confirmation',
          subject: 'Booking Cancelled',
          message: adminMessage,
          priority: 'medium',
          isAdminCopy: true,
          relatedBookingId: booking._id
        });
        
          console.log('Cancellation notifications sent successfully');
        } catch (notifError) {
          console.error('Error sending cancellation notifications:', notifError);
          // Don't fail the cancellation if notifications fail
        }
      });
    }
    
    // Emit WebSocket event to notify user of booking status change
    try {
      const { emitToUser } = require('../socket/socketServer');
      emitToUser(booking.user._id.toString(), 'bookingStatusUpdated', {
        bookingId: booking._id,
        status: booking.status,
        booking: booking
      });
    } catch (socketError) {
      console.error('Error emitting booking status update via WebSocket:', socketError);
    }
    
    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message,
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    
    // Find the booking first
    const booking = await Booking.findById(id).populate('car user');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking',
      });
    }

    // Find associated payment
    const payment = await Payment.findOne({ booking: id });
    
    let refundInfo = null;

    // Only process refunds for CONFIRMED bookings with verified payments
    // Pending bookings have no verified payment, so no refund needed
    if (booking.status === 'confirmed' && payment && payment.status === 'verified') {
      const refundCalculation = calculateRefundAmount(
        payment.amount,
        booking.startDate,
        new Date(),
        payment.paymentMethod,
        payment.status
      );

      refundInfo = refundCalculation;

      // If refund is required, update payment with refund request
      if (refundCalculation.requiresRefund && refundCalculation.refundAmount > 0) {
        payment.refundStatus = 'pending';
        payment.refundAmount = refundCalculation.refundAmount;
        payment.refundMethod = payment.paymentMethod === 'cash' ? 'cash' : payment.paymentMethod;
        payment.refundRequestedAt = new Date();
        payment.refundNotes = `Refund requested: ${refundCalculation.reason}. ${cancellationReason ? `Cancellation reason: ${cancellationReason}` : ''}`;
        await payment.save();

        // Send notification to admins about refund request
        const customerName = booking.user.profile?.firstName && booking.user.profile?.lastName
          ? `${booking.user.profile.firstName} ${booking.user.profile.lastName}`
          : booking.user.email;

        await broadcastToAdmins({
          type: 'refundRequest',
          title: 'Refund Request - Booking Cancelled',
          subject: 'Refund Request - Booking Cancelled',
          message: `REFUND REQUEST

Booking ID: ${booking.bookingId || booking._id}
Customer: ${customerName}
Amount to Refund: ₱${refundCalculation.refundAmount?.toLocaleString()}
Refund Percentage: ${refundCalculation.refundPercentage}%
Payment Method: ${payment.paymentMethod.toUpperCase()}

Reason: ${refundCalculation.reason}
Hours Until Pickup: ${refundCalculation.hoursUntilPickup}

${cancellationReason ? `Cancellation Reason: ${cancellationReason}` : ''}

ACTION REQUIRED:
1. Go to Refund Management page
2. Process the refund via ${payment.paymentMethod.toUpperCase()}
3. Mark as processed once completed

Note: Customer is waiting for refund processing.`,
          priority: 'high',
          relatedBookingId: booking._id
        });
      }
    }
    
    // Update booking status to cancelled
    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason || 'No reason provided';
    booking.cancelledAt = new Date();
    await booking.save();
    
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking,
        refundInfo: refundInfo ? {
          refundAmount: refundInfo.refundAmount,
          refundPercentage: refundInfo.refundPercentage,
          reason: refundInfo.reason,
          requiresRefund: refundInfo.requiresRefund
        } : null
      },
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message,
    });
  }
};

// Update booking details (for pending bookings only)
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, pickupLocation, dropoffLocation } = req.body;
    const userId = req.user.id;

    // Find the booking
    const booking = await Booking.findById(id).populate('car');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user owns this booking or is admin
    if (booking.user.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this booking',
      });
    }

    // Only allow modification of pending bookings
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be modified',
      });
    }

    // If dates are being changed, check car availability
    if (startDate || endDate) {
      const newStartDate = startDate ? new Date(startDate) : booking.startDate;
      const newEndDate = endDate ? new Date(endDate) : booking.endDate;

      // Validate dates
      if (newStartDate >= newEndDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date',
        });
      }

      // Check if car is available for new dates (excluding current booking)
      const conflictingBookings = await Booking.find({
        car: booking.car._id,
        _id: { $ne: id }, // Exclude current booking
        status: { $in: ['pending', 'confirmed', 'active'] },
        $or: [
          {
            startDate: { $lte: newEndDate },
            endDate: { $gte: newStartDate }
          }
        ]
      });

      if (conflictingBookings.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Car is not available for the selected dates',
        });
      }

      // Calculate new total price if dates changed
      const days = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24));
      const totalPrice = days * booking.car.pricePerDay;

      booking.startDate = newStartDate;
      booking.endDate = newEndDate;
      booking.totalPrice = totalPrice;
    }

    // Update location if provided
    if (pickupLocation) {
      booking.pickupLocation = pickupLocation;
    }
    if (dropoffLocation) {
      booking.dropoffLocation = dropoffLocation;
    }

    // Save the updated booking
    const updatedBooking = await booking.save();
    
    // Populate the updated booking
    await updatedBooking.populate('car user');

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating booking',
      error: error.message,
    });
  }
};

// Delete booking (admin only)
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findByIdAndDelete(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully',
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting booking',
      error: error.message,
    });
  }
};

// Extend booking (for active rentals)
exports.extendBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { extendDays } = req.body;
    
    // Validate input
    if (!extendDays || extendDays < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please specify valid number of days to extend (minimum 1 day)',
      });
    }
    
    // Find the booking and populate car details
    const booking = await Booking.findById(id).populate('car');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    
    // Check if user owns this booking or is admin
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to extend this booking',
      });
    }
    
    // Only allow extension for active/confirmed bookings
    if (!['confirmed', 'active', 'rented'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot extend booking with status: ${booking.status}. Only active rentals can be extended.`,
      });
    }
    
    // Calculate new end date
    const currentEndDate = new Date(booking.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + parseInt(extendDays));
    
    // Check if car is available for the extended period
    // Look for any conflicting bookings that would overlap with the extension
    const conflictingBookings = await Booking.find({
      _id: { $ne: id }, // Exclude current booking
      car: booking.car._id,
      status: { $in: ['pending', 'confirmed', 'rented', 'active'] },
      $or: [
        {
          // Booking starts on or before the new end date AND after or on current end date
          startDate: { 
            $lte: newEndDate,  // Changed from $lt to $lte to catch same-day conflicts
            $gte: currentEndDate  // Booking starts on or after current end
          }
        },
        {
          // Booking ends after the current end date AND starts before it
          startDate: { $lt: currentEndDate },
          endDate: { $gt: currentEndDate }
        },
        {
          // Booking completely contains the extension period
          startDate: { $lte: currentEndDate },
          endDate: { $gte: newEndDate }
        }
      ]
    });
    
    if (conflictingBookings.length > 0) {
      // Find the earliest conflicting date
      const earliestConflict = conflictingBookings.reduce((earliest, booking) => {
        return booking.startDate < earliest.startDate ? booking : earliest;
      });
      
      // Calculate the actual maximum days available
      // The max extension is the day BEFORE the next booking starts
      const conflictStartDate = new Date(earliestConflict.startDate);
      const timeDiff = conflictStartDate.getTime() - currentEndDate.getTime();
      const maxDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      // If the next booking starts on the same day as current rental ends, maxDays will be 0
      if (maxDays <= 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot extend rental. Another booking starts on ${earliestConflict.startDate.toLocaleDateString()}, which conflicts with your current end date.`,
          maxExtendDays: 0,
          conflictDate: earliestConflict.startDate,
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Cannot extend for ${extendDays} days. Another booking exists starting ${earliestConflict.startDate.toLocaleDateString()}. Maximum extension: ${maxDays} day(s).`,
        maxExtendDays: maxDays,
        conflictDate: earliestConflict.startDate,
      });
    }
    
    // Calculate additional price
    const additionalPrice = extendDays * booking.car.pricePerDay;
    const newTotalPrice = booking.totalPrice + additionalPrice;
    
    // Update the booking
    booking.endDate = newEndDate;
    booking.totalPrice = newTotalPrice;
    booking.extendedCount = (booking.extendedCount || 0) + 1;
    booking.lastExtendedDate = new Date();
    
    await booking.save();
    
    // Populate the booking with user and car details before sending response
    await booking.populate(['user', 'car']);
    
    // Send response immediately
    res.status(200).json({
      success: true,
      message: `Booking successfully extended by ${extendDays} day(s)`,
      data: {
        booking,
        extension: {
          daysExtended: extendDays,
          additionalCost: additionalPrice,
          newEndDate: newEndDate,
          newTotalPrice: newTotalPrice,
        }
      },
    });
    
    // Send notifications asynchronously after response
    setImmediate(async () => {
      try {
        const Notification = require('../models/Notification');
        const { sendEmailNotification } = require('./notificationController');
        
        // Format the dates for display
        const formattedOldEndDate = currentEndDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        const formattedNewEndDate = newEndDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        
        // Create notification message
        const notificationMessage = `Your rental for ${booking.car.make} ${booking.car.model} has been successfully extended by ${extendDays} day(s). ` +
          `Previous return date: ${formattedOldEndDate}. ` +
          `New return date: ${formattedNewEndDate}. ` +
          `Additional cost: ₱${additionalPrice.toLocaleString()}. ` +
          `New total: ₱${newTotalPrice.toLocaleString()}.`;
        
        // Create in-app notification for the user
        const extensionNotif = await Notification.create({
          userId: booking.user._id,
          type: 'rental_extension',
          subject: 'Rental Extension Confirmed',
          message: notificationMessage,
          relatedBookingId: booking._id,
          priority: 'medium',
          seen: false
        });
        emitNotificationViaWebSocket(booking.user._id, extensionNotif);
        
        // Send email notification to the user
        const emailSubject = `Rental Extension Confirmed - ${booking.car.make} ${booking.car.model}`;
        const emailMessage = `
          <h2>Rental Extension Confirmed</h2>
          <p>Dear ${booking.user.profile?.firstName || booking.user.name},</p>
          <p>Your rental has been successfully extended!</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Extension Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Vehicle:</strong> ${booking.car.year} ${booking.car.make} ${booking.car.model}</li>
              <li><strong>Days Extended:</strong> ${extendDays} day(s)</li>
              <li><strong>Previous Return Date:</strong> ${formattedOldEndDate}</li>
              <li><strong>New Return Date:</strong> ${formattedNewEndDate}</li>
              <li><strong>Additional Cost:</strong> ₱${additionalPrice.toLocaleString()}</li>
              <li><strong>New Total Cost:</strong> ₱${newTotalPrice.toLocaleString()}</li>
            </ul>
          </div>
          <p><strong>Important:</strong> Please ensure you return the vehicle by the new return date to avoid late fees.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Thank you for choosing our car rental service!</p>
        `;
        
        await sendEmailNotification(booking.user._id, emailSubject, emailMessage);
        
        // Also notify admins about the extension
        const adminMessage = `Rental Extension: ${booking.user.profile?.firstName || ''} ${booking.user.profile?.lastName || ''} ` +
          `has extended their rental of ${booking.car.make} ${booking.car.model} by ${extendDays} day(s). ` +
          `New return date: ${formattedNewEndDate}. Additional revenue: ₱${additionalPrice.toLocaleString()}.`;
        
        // Get all admin users and create notifications for them
        const User = require('../models/User');
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        
        if (adminUsers.length > 0) {
          const adminNotifications = adminUsers.map(admin => ({
            userId: admin._id,
            type: 'rental_extension',
            subject: 'Customer Extended Rental',
            message: adminMessage,
            relatedBookingId: booking._id,
            priority: 'low',
            seen: false,
            isAdminCopy: true  // Add this flag so it shows in admin notification page
          }));
          
          const insertedAdminNotifs = await Notification.insertMany(adminNotifications);
          insertedAdminNotifs.forEach(notif => emitNotificationViaWebSocket(notif.userId, notif));
          
          // Send email to admins
          for (const admin of adminUsers) {
            await sendEmailNotification(
              admin._id, 
              'Rental Extension Alert', 
              `<h3>Rental Extension Alert</h3><p>${adminMessage}</p>`
            );
          }
        }
        
        console.log('Extension notifications sent successfully');
      } catch (notificationError) {
        // Log error but don't fail the extension
        console.error('Error sending extension notifications:', notificationError);
      }
    });
  } catch (error) {
    console.error('Error extending booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error extending booking',
      error: error.message,
    });
  }
};

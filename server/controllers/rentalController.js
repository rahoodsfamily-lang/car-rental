const Rental = require('../models/Rental');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const User = require('../models/User');
const { emitToUser } = require('../socket/socketServer');
const { generateRentalInvoice } = require('../utils/pdfGenerator');
const { sendRentalStatusUpdate, sendOverdueAlert, broadcastToAdmins, sendEmailToAdmins } = require('./notificationController');
const { formatBookingId, formatRentalId } = require('../utils/idFormatter');
const { checkAndUpdateOverdueRentals } = require('../utils/realTimeOverdueCheck');
const { calculateLateFee, formatLateFeeInfo } = require('../utils/lateFeeCalculator');
const path = require('path');
const fs = require('fs');

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

// Get all rentals with optional filtering
exports.getAllRentals = async (req, res) => {
  try {
    const { status, userId, carId, userName, carName } = req.query;
    const mongoose = require('mongoose');
    let filter = {};

    if (status) filter.rentalStatus = status;

    // Validate ObjectId inputs to avoid CastError 500s
    if (userId) {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        filter.user = userId;
      }
      // if invalid, ignore userId filter
    }

    if (carId) {
      if (mongoose.Types.ObjectId.isValid(carId)) {
        filter.car = carId;
      }
    }

    // Name-based searching
    if (userName) {
      const regex = new RegExp(userName, 'i');
      const users = await User.find({
        $or: [
          { 'profile.firstName': regex },
          { 'profile.lastName': regex },
          { email: regex }
        ]
      }).select('_id');
      const userIds = users.map(u => u._id);
      if (userIds.length) {
        filter.user = { $in: userIds };
      }
    }

    if (carName) {
      const regex = new RegExp(carName, 'i');
      const cars = await Car.find({
        $or: [
          { make: regex },
          { model: regex }
        ]
      }).select('_id');
      const carIds = cars.map(c => c._id);
      if (carIds.length) {
        filter.car = filter.car ? { $in: carIds, ...filter.car } : { $in: carIds };
      }
    }

    const rentals = await Rental.find(filter)
      .populate('user', 'email profile.firstName profile.lastName profile.phone profile.address profile.latitude profile.longitude')
      .populate('car', 'make model year pricePerDay imageUrls location geolocation')
      .populate('booking', 'startDate endDate location totalPrice latitude longitude')
      .sort({ createdAt: -1 });

    // Real-time overdue check: Update any active rentals that should be overdue
    await checkAndUpdateOverdueRentals(rentals);

    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rentals', error: error.message });
  }
};

// Get rental by ID
exports.getRentalById = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('user', 'email profile.firstName profile.lastName profile.phone')
      .populate('car', 'make model year pricePerDay imageUrls location geolocation')
      .populate('booking', 'startDate endDate location');

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Auto-calculate late fee for overdue rentals if not already set
    if (rental.rentalStatus === 'overdue' && rental.lateFee === 0 && rental.booking && rental.car) {
      try {
        const lateFeeInfo = calculateEstimatedLateFee(
          rental.booking.endDate,
          rental.car.pricePerDay
        );
        
        if (lateFeeInfo.isOverdue) {
          rental.lateFee = lateFeeInfo.totalLateFee;
          await rental.save();
          console.log(`[AUTO-CALCULATED in getRentalById] Late fee for rental ${rental._id}: ₱${rental.lateFee} (${lateFeeInfo.daysOverdue} days overdue)`);
        }
      } catch (lateFeeError) {
        console.error('[ERROR] Failed to calculate late fee in getRentalById:', lateFeeError);
      }
    }

    // Add calculated total to response
    const rentalWithTotal = rental.toObject();
    rentalWithTotal.calculatedTotal = rental.calculateTotalFees();
    
    res.json(rentalWithTotal);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rental', error: error.message });
  }
};

// Create rental (check-out)
exports.createRental = async (req, res) => {
  try {
    const { checkOutDate, notes } = req.body;
    const bookingId = req.params.id;

    // Parallel fetch: booking and check for existing rental
    const [booking, existingRental] = await Promise.all([
      Booking.findById(bookingId).populate('car'),
      Rental.findOne({ booking: bookingId, rentalStatus: 'active' })
    ]);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Only confirmed bookings can be checked out' });
    }

    if (existingRental) {
      return res.status(400).json({ message: 'This booking has already been checked out' });
    }

    // CRITICAL FIX: Check if the CAR itself has any active rentals (not just this booking)
    const carActiveRental = await Rental.findOne({ 
      car: booking.car._id, 
      rentalStatus: 'active' 
    });

    if (carActiveRental) {
      return res.status(400).json({ 
        message: 'This car is currently rented out and cannot be checked out again. Please complete the existing rental first.' 
      });
    }

    // Also check if the car has other confirmed bookings that overlap with this rental period
    const overlappingBookings = await Booking.find({
      car: booking.car._id,
      _id: { $ne: bookingId }, // Exclude current booking
      status: { $in: ['confirmed', 'active'] },
      $or: [
        {
          startDate: { $lte: booking.endDate },
          endDate: { $gte: booking.startDate }
        }
      ]
    });

    if (overlappingBookings.length > 0) {
      return res.status(400).json({ 
        message: 'This car has other confirmed bookings during this period and cannot be checked out.' 
      });
    }

    // Create rental document with proper checkout date
    const actualCheckOutDate = checkOutDate ? new Date(checkOutDate) : new Date();
    const rental = new Rental({
      user: booking.user,
      car: booking.car,
      booking: booking._id,
      checkOutDate: actualCheckOutDate,
      expectedReturnDate: booking.endDate,
      rentalStatus: 'active',
      totalRentalFee: booking.totalPrice || 0,
      notes: notes || ''
    });

    // Save rental ONLY - this is the critical operation
    const savedRental = await rental.save();

    // Send response immediately - BEFORE any other operations
    res.status(201).json({
      success: true,
      message: 'Rental created successfully',
      data: savedRental
    });
    
    // Update car and booking in background - non-blocking
    Promise.resolve().then(async () => {
      try {
        const car = await Car.findById(booking.car);
        car.availability = 'rented';
        booking.status = 'active';
        
        await Promise.all([
          car.save(),
          booking.save()
        ]);
        
        // Emit WebSocket event to notify user that booking is now active
        try {
          const { emitToUser } = require('../socket/socketServer');
          const populatedBooking = await Booking.findById(booking._id)
            .populate('car', 'make model year pricePerDay imageUrls location geolocation')
            .populate('user', 'email profile.firstName profile.lastName');
          
          emitToUser(booking.user.toString(), 'bookingStatusUpdated', {
            bookingId: booking._id,
            status: 'active',
            booking: populatedBooking
          });
        } catch (socketError) {
          console.error('Error emitting booking status update via WebSocket:', socketError);
        }
      } catch (bgError) {
        console.error('Background update error:', bgError);
      }
    }).catch(err => console.error('Background promise error:', err));

    // Send notification in background - completely non-blocking
    // Response already sent above
    Promise.resolve().then(async () => {
      try {
        const Notification = require('../models/Notification');
        // Need to fetch car details for notification
        const car = await Car.findById(booking.car).select('make model year pricePerDay');
        const user = await User.findById(booking.user).select('profile.firstName profile.lastName profile.phone email');
        const rentalDays = Math.ceil((new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24));
        const renterName = user ? `${user.profile.firstName} ${user.profile.lastName}` : 'Customer';
        
        // User notification message
        const message = `Your rental for ${car.year} ${car.make} ${car.model} has been successfully checked out! 

Rental Details:
• Delivery Location: ${booking.location}
• Rental Period: ${rentalDays} day${rentalDays !== 1 ? 's' : ''}
• Start Date: ${new Date(booking.startDate).toLocaleDateString()}
• Expected Return: ${new Date(booking.endDate).toLocaleDateString()}
• Daily Rate: ₱${car.pricePerDay}
• Total Rental Cost: ₱${booking.totalPrice}

Please ensure to return the vehicle by the scheduled date to avoid late fees. Drive safely and enjoy your rental!`;
          
          // Create user notification directly
          const userNotification = await Notification.create({
            userId: booking.user,
            type: 'rental_status',
            subject: 'Rental Checked Out',
            message: message,
            relatedRentalId: savedRental._id,
            priority: 'medium',
            seen: false
          });
          
          // Emit WebSocket event
          emitNotificationViaWebSocket(booking.user, userNotification);
          
          // Send email notification to customer
          try {
            const { sendEmailNotification } = require('./notificationController');
            await sendEmailNotification(
              booking.user,
              'Rental Check-out Confirmation - Car Rental System',
              message,
              'rentalStatus'
            );
            console.log(`Check-out email sent to customer for rental ${savedRental._id}`);
          } catch (emailError) {
            console.error('Failed to send check-out email:', emailError);
          }
          
          // Admin notification removed - admin performs this action themselves
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }).catch(err => console.error('Notification promise error:', err));

    // Response already sent above before notifications
  } catch (error) {
    res.status(500).json({ message: 'Error creating rental', error: error.message });
  }
};

// Complete rental (check-in)
exports.completeRental = async (req, res) => {
  console.log('[DEBUG] completeRental function called with rental ID:', req.params.id);
  console.log('[DEBUG] Request body:', req.body);
  
  try {
    const { checkInDate, lateFee, damageFee, notes } = req.body;

    // Find the rental with populated booking and car data for late fee calculation
    const rental = await Rental.findById(req.params.id)
      .populate({
        path: 'user',
        select: 'email profile'  // Select entire profile object
      })
      .populate('booking', 'endDate')
      .populate('car', 'pricePerDay make model year');
      
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Check if rental is already completed
    if (rental.rentalStatus === 'completed') {
      return res.status(400).json({ message: 'Rental is already completed' });
    }

    // Set check-in date
    const actualCheckInDate = checkInDate ? new Date(checkInDate) : new Date();
    rental.checkInDate = actualCheckInDate;
    
    // Calculate late fee automatically if not provided and rental has booking data
    let calculatedLateFee = lateFee || 0;
    
    if (!lateFee && rental.booking && rental.booking.endDate && rental.car && rental.car.pricePerDay) {
      try {
        const lateFeeInfo = calculateLateFee(
          rental.booking.endDate,
          actualCheckInDate,
          rental.car.pricePerDay
        );
        
        if (lateFeeInfo.isOverdue) {
          calculatedLateFee = lateFeeInfo.totalLateFee;
          console.log(`[AUTO-CALCULATED] Late fee for rental ${rental._id}: ₱${calculatedLateFee} (${lateFeeInfo.daysOverdue} days overdue)`);
        }
      } catch (lateFeeError) {
        console.error('[ERROR] Failed to calculate late fee:', lateFeeError);
        // Continue with manual late fee or 0
      }
    }
    
    // Update rental with calculated or provided values
    rental.lateFee = calculatedLateFee;
    rental.damageFee = damageFee || 0;
    rental.notes = notes || rental.notes;
    rental.rentalStatus = 'completed';
    rental.calculateTotalFees();

    const updatedRental = await rental.save();

    // Send response immediately - BEFORE any other operations
    res.json(updatedRental);
    
    // Update booking and car - do it synchronously to ensure it happens
    try {
      
      // Synchronize booking status and payment status when rental is completed
      if (rental.booking) {
        await Booking.findByIdAndUpdate(
          rental.booking, 
          { 
            status: 'completed',
            paymentStatus: 'paid' // Mark payment as paid when rental is completed
          }, 
          { new: true, runValidators: true }
        );
      } else {
        // Fallback: try to populate the booking if it wasn't populated
        const fullRental = await Rental.findById(rental._id).populate('booking');
        if (fullRental && fullRental.booking) {
          await Booking.findByIdAndUpdate(
            fullRental.booking._id,
            { 
              status: 'completed',
              paymentStatus: 'paid'
            },
            { new: true, runValidators: true }
          );
        }
      }
      
      // Update car status to available
      await Car.findByIdAndUpdate(rental.car, { availability: 'available' });
    } catch (updateError) {
      console.error('[ERROR] Failed to update booking/car:', updateError);
      // Don't fail the whole request, but log the error
    }

    // Send notification in background - completely non-blocking
    // Response already sent above
    Promise.resolve().then(async () => {
      try {
        const car = await Car.findById(rental.car);
        
        // Fetch user separately with proper field selection
        // Populate with select on nested fields doesn't work reliably
        const userId = typeof rental.user === 'string' ? rental.user : rental.user?._id;
        
        // Try fetching without select first to see all data
        const fullUser = await User.findById(userId);
        console.log('[DEBUG] Full user object profile:', fullUser?.profile);
        console.log('[DEBUG] Full user phone:', fullUser?.profile?.phone);
        
        // Now fetch with select
        const user = await User.findById(userId).select('profile.firstName profile.lastName profile.phone email');
        
        console.log('[DEBUG] Completion - User data:', {
          userType: typeof user,
          hasProfile: !!user?.profile,
          firstName: user?.profile?.firstName,
          lastName: user?.profile?.lastName,
          phone: user?.profile?.phone,
          phoneValue: user?.profile?.phone || 'PHONE IS UNDEFINED',
          email: user?.email
        });
        
        // Fallback if user is somehow not fetched
        if (!user || !user.profile) {
          console.error('[ERROR] User not properly fetched for rental:', rental._id);
        }
        const totalFees = rental.calculateTotalFees();
        const rentalDays = Math.ceil((new Date(rental.checkInDate) - new Date(rental.checkOutDate)) / (1000 * 60 * 60 * 24));
        const renterName = user ? `${user.profile.firstName} ${user.profile.lastName}` : 'Customer';
        
        // User notification
        const message = `Your rental for ${car.year} ${car.make} ${car.model} has been successfully completed!

Rental Summary:
• Check-out Date: ${new Date(rental.checkOutDate).toLocaleDateString()}
• Check-in Date: ${new Date(rental.checkInDate).toLocaleDateString()}
• Total Rental Days: ${rentalDays} day${rentalDays !== 1 ? 's' : ''}
• Base Rental Fee: ₱${rental.rentalFee}
${rental.lateFee > 0 ? `• Late Return Fee: ₱${rental.lateFee}` : '• Late Fee: ₱0 (Returned on time!)'}
${rental.damageFee > 0 ? `• Damage/Cleaning Fee: ₱${rental.damageFee}` : ''}
• Total Amount Charged: ₱${totalFees}

Thank you for choosing our car rental service! We hope you had a great experience and look forward to serving you again.`;
        // Create user notification directly using fast insertion
        const Notification = require('../models/Notification');
        const completionNotif = await Notification.create({
          userId: rental.user,
          type: 'rental_status',
          subject: 'Rental Completed',
          message: message,
          relatedRentalId: rental._id,
          priority: 'medium',
          seen: false
        });
        emitNotificationViaWebSocket(rental.user, completionNotif);
        
        // Send email notification to customer
        try {
          const { sendEmailNotification } = require('./notificationController');
          await sendEmailNotification(
            rental.user,
            'Rental Completed - Car Rental System',
            message,
            'rentalStatus'
          );
          console.log(`Rental completion email sent to customer for rental ${rental._id}`);
        } catch (emailError) {
          console.error('Failed to send rental completion email:', emailError);
        }
        
        // Admin notification removed - admin performs this action themselves
      } catch (notificationError) {
        console.error('[ERROR] Failed to send rental completion notification:', notificationError);
        console.error('[ERROR] Stack trace:', notificationError.stack);
        // Don't fail the rental completion if notification fails
      }
    }).catch(err => console.error('Notification promise error:', err));

    // Response already sent above before notifications
  } catch (error) {
    res.status(500).json({ message: 'Error completing rental', error: error.message });
  }
};

// Update rental status (admin only)
exports.updateRentalStatus = async (req, res, next) => {
  try {
    const { rentalStatus, lateFee, damageFee, notes } = req.body;

    // Find the rental WITHOUT populate (faster)
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Update rental
    rental.rentalStatus = rentalStatus;
    if (lateFee !== undefined) rental.lateFee = lateFee;
    if (damageFee !== undefined) rental.damageFee = damageFee;
    if (notes !== undefined) rental.notes = notes;
    
    // Set checkInDate when rental is completed (if not already set)
    if (rentalStatus === 'completed' && !rental.checkInDate) {
      rental.checkInDate = new Date();
    }
    
    rental.calculateTotalFees();

    // Save rental first
    const updatedRental = await rental.save();
    
    // Update booking SYNCHRONOUSLY before sending response
    if (rental.booking) {
      let bookingStatus;
      switch (rentalStatus) {
        case 'active':
          bookingStatus = 'active';
          break;
        case 'completed':
          bookingStatus = 'completed';
          break;
        case 'cancelled':
          bookingStatus = 'cancelled';
          break;
        case 'overdue':
          bookingStatus = 'active'; // Keep booking active for overdue rentals
          break;
        default:
          bookingStatus = 'active'; // Default fallback
      }
      
      // Update booking status and payment status when rental is completed
      const bookingUpdate = { status: bookingStatus };
      if (bookingStatus === 'completed') {
        bookingUpdate.paymentStatus = 'paid'; // Mark as paid when rental completes
      }
      await Booking.findByIdAndUpdate(rental.booking, bookingUpdate);
    }

    // Update car status if needed
    if (rentalStatus === 'completed' || rentalStatus === 'cancelled') {
      await Car.findByIdAndUpdate(rental.car, { availability: 'available' });
    }
    
    // Send response after critical updates are done
    res.json(updatedRental);

    // Send notification in background - completely non-blocking
    // Response already sent above
    Promise.resolve().then(async () => {
      try {
        const Notification = require('../models/Notification');
        const Booking = require('../models/Booking');
        const car = await Car.findById(rental.car);
        const user = await User.findById(rental.user).select('profile.firstName profile.lastName profile.phone email');
        const booking = await Booking.findById(rental.booking).select('bookingId');
        const renterName = user ? `${user.profile.firstName} ${user.profile.lastName}` : 'Customer';
        let message = '';
        let adminMessage = '';
        let subject = '';
        let adminSubject = '';
        let priority = 'medium';
        
        if (rentalStatus === 'overdue') {
          // Validate booking.endDate before calculations
          const endDate = rental.booking?.endDate ? new Date(rental.booking.endDate) : null;
          const isValidEndDate = endDate && !isNaN(endDate.getTime());
          
          const daysOverdue = isValidEndDate 
            ? Math.ceil((new Date() - endDate) / (1000 * 60 * 60 * 24))
            : 0;
          const lateFeePerDay = car.pricePerDay * 0.2; // 20% late fee per day
          const estimatedLateFee = lateFeePerDay * daysOverdue;
          
          // Format dates with fallbacks
          const endDateStr = isValidEndDate ? endDate.toLocaleDateString() : 'Not specified';
          const daysOverdueStr = isValidEndDate ? `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}` : 'Unknown (return date not set)';
          const lateFeeStr = isValidEndDate ? `₱${estimatedLateFee.toFixed(2)}` : 'To be determined';
          
          // User notification
          message = `Your rental for ${car.year} ${car.make} ${car.model} is now OVERDUE!

Overdue Details:
• Original Return Date: ${endDateStr}
• Days Overdue: ${daysOverdueStr}
• Daily Late Fee: ₱${lateFeePerDay.toFixed(2)} (20% of daily rate)
• Current Late Fee: ${lateFeeStr}
• Daily Rental Rate: ₱${car.pricePerDay}

IMPORTANT: Please return the vehicle immediately to avoid additional late fees. The late fee increases by ₱${lateFeePerDay.toFixed(2)} for each additional day. 

If you need to extend your rental, please contact us immediately or use the extend rental option in your dashboard.`;
          
          subject = 'Rental Overdue';
          priority = 'high';

          // Detailed admin notification for overdue
          adminMessage = `RENTAL OVERDUE: ${renterName} has not returned the vehicle!

Overdue Rental Details:
• Vehicle: ${car.year} ${car.make} ${car.model}
• Customer: ${renterName}
• Email: ${user?.email || 'N/A'}
• Phone: ${user?.profile?.phone || 'N/A'}
• Check-out Date: ${new Date(rental.checkOutDate).toLocaleDateString()}
• Original Return Date: ${endDateStr}
• Current Date: ${new Date().toLocaleDateString()}
• Days Overdue: ${daysOverdueStr}

Financial Impact:
• Daily Rental Rate: ₱${car.pricePerDay}
• Daily Late Fee: ₱${lateFeePerDay.toFixed(2)} (20% of daily rate)
• Current Late Fee Accumulated: ${lateFeeStr}
• Potential Daily Loss: ₱${car.pricePerDay} (vehicle unavailable for new rentals)

ACTION REQUIRED:
1. Contact customer immediately via phone and email
2. Send formal overdue notice if not already sent
3. ${isValidEndDate && daysOverdue > 7 ? 'Consider legal action if vehicle not returned within 24 hours' : 'Monitor situation and send follow-up notices'}
4. Update vehicle status in fleet management
${!isValidEndDate ? '\n⚠️ WARNING: Return date not properly set in booking. Please verify booking details and update system.' : ''}

Rental ID: ${rental.rentalId || formatRentalId(rental._id)}
Booking ID: ${booking?.bookingId || formatBookingId(rental.booking)}`;

          adminSubject = isValidEndDate 
            ? `OVERDUE - ${renterName} (${car.make} ${car.model}) - ${daysOverdue} days`
            : `OVERDUE - ${renterName} (${car.make} ${car.model}) - Date Unknown`;
          
          // Create user notification directly
          const overdueNotif = await Notification.create({
            userId: rental.user,
            type: 'overdue_alert',
            subject: subject,
            message: message,
            relatedRentalId: rental._id,
            priority: priority,
            seen: false
          });
          emitNotificationViaWebSocket(rental.user, overdueNotif);
          
          // Get all admin users and create notifications using fast insertMany
          const adminUsers = await User.find({ role: 'admin' }).select('_id');
          if (adminUsers.length > 0) {
            const adminNotifications = adminUsers.map(admin => ({
              userId: admin._id,
              type: 'overdue_alert',
              subject: adminSubject,
              message: adminMessage,
              relatedRentalId: rental._id,
              priority: 'high',
              seen: false,
              isAdminCopy: true
            }));
            
            const insertedAdminNotifs = await Notification.insertMany(adminNotifications);
            insertedAdminNotifs.forEach(notif => emitNotificationViaWebSocket(notif.userId, notif));
          }
          
          // Send emails asynchronously (don't wait)
          sendEmailToAdmins(adminSubject, adminMessage).catch(err => 
            console.error('Email send error:', err)
          );
        } else if (rentalStatus === 'completed') {
          // Calculate rental duration and fees for completion notification
          const checkOutDate = new Date(rental.checkOutDate);
          const checkInDate = rental.checkInDate || new Date();
          const rentalDays = Math.ceil((checkInDate - checkOutDate) / (1000 * 60 * 60 * 24));
          
          // Auto-calculate late fee if not already set and rental has booking data
          if (rental.lateFee === 0 && rental.booking && car.pricePerDay) {
            try {
              // Get booking data for late fee calculation
              const booking = await Booking.findById(rental.booking).select('endDate');
              if (booking && booking.endDate) {
                const lateFeeInfo = calculateLateFee(
                  booking.endDate,
                  checkInDate,
                  car.pricePerDay
                );
                
                if (lateFeeInfo.isOverdue) {
                  rental.lateFee = lateFeeInfo.totalLateFee;
                  await rental.save(); // Save the calculated late fee
                  console.log(`[AUTO-CALCULATED via updateRentalStatus] Late fee for rental ${rental._id}: ₱${rental.lateFee} (${lateFeeInfo.daysOverdue} days overdue)`);
                }
              }
            } catch (lateFeeError) {
              console.error('[ERROR] Failed to calculate late fee in updateRentalStatus:', lateFeeError);
            }
          }
          
          const totalFees = rental.calculateTotalFees();
          
          // User notification for completion (using consistent format)
          message = `Your rental for ${car.year} ${car.make} ${car.model} has been successfully completed!

Rental Summary:
• Check-out Date: ${checkOutDate.toLocaleDateString()}
• Check-in Date: ${checkInDate.toLocaleDateString()}
• Total Rental Days: ${rentalDays} day${rentalDays !== 1 ? 's' : ''}
• Base Rental Fee: ₱${rental.totalRentalFee || 0}
${rental.lateFee > 0 ? `• Late Return Fee: ₱${rental.lateFee}` : '• Late Fee: ₱0 (Returned on time!)'}
${rental.damageFee > 0 ? `• Damage/Cleaning Fee: ₱${rental.damageFee}` : ''}
• Total Amount Charged: ₱${totalFees}

Thank you for choosing our car rental service! We hope you had a great experience and look forward to serving you again.`;
          
          subject = 'Rental Completed';

          // Admin notification removed for completion - admin performs this action themselves
          
          // Create user notification directly
          const completedNotif = await Notification.create({
            userId: rental.user,
            type: 'rental_status',
            subject: subject,
            message: message,
            relatedRentalId: rental._id,
            priority: priority,
            seen: false
          });
          emitNotificationViaWebSocket(rental.user, completedNotif);
          
          // Send email notification to customer for rental completion
          try {
            const { sendEmailNotification } = require('./notificationController');
            await sendEmailNotification(
              rental.user,
              'Rental Completed - Car Rental System',
              message,
              'rentalStatus'
            );
            console.log(`Rental completion email sent to customer for rental ${rental._id}`);
          } catch (emailError) {
            console.error('Failed to send rental completion email:', emailError);
          }
        } else if (rentalStatus === 'cancelled') {
          // For rental cancellation - create detailed message
          // car and user already declared at top of Promise block, reuse them
          
          // Use pre-formatted rentalId from model or fallback to formatting _id
          const rentalIdFormatted = rental.rentalId || `RNT-${rental._id.toString().slice(-5).toUpperCase()}`;
          
          message = `Your rental has been cancelled.\n\n` +
            `RENTAL DETAILS\n` +
            `Rental ID: ${rentalIdFormatted}\n` +
            `Status: CANCELLED\n` +
            `Cancellation Date: ${new Date().toLocaleString()}\n\n` +
            `VEHICLE INFORMATION\n` +
            `Vehicle: ${car.year} ${car.make} ${car.model}\n` +
            `Daily Rate: PHP ${car.pricePerDay?.toLocaleString() || 'N/A'}\n\n` +
            `ORIGINAL RENTAL PERIOD\n` +
            `Check-out Date: ${rental.checkOutDate ? new Date(rental.checkOutDate).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            }) : 'Not checked out'}\n` +
            `Expected Return: ${rental.expectedReturnDate ? new Date(rental.expectedReturnDate).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            }) : 'N/A'}\n\n` +
            `• Feel free to make a new booking anytime\n\n` +
            `We apologize for any inconvenience and hope to serve you in the future.`;
          
          subject = 'Rental Cancelled';
          
          // Create user notification directly
          const cancelledNotif = await Notification.create({
            userId: rental.user,
            type: 'rental_status',
            subject: subject,
            message: message,
            relatedRentalId: rental._id,
            priority: 'high',  // High priority for cancellation
            seen: false
          });
          emitNotificationViaWebSocket(rental.user, cancelledNotif);
          
          // Send email notification to customer
          try {
            const { sendEmailNotification } = require('./notificationController');
            await sendEmailNotification(
              rental.user,
              'Rental Cancellation - Car Rental System',
              message,
              'rentalCancellation'
            );
            console.log(`Rental cancellation email sent to customer for rental ${rental._id}`);
          } catch (emailError) {
            console.error('Failed to send rental cancellation email:', emailError);
          }
          
          // Send notification to admins about rental cancellation
          // user already declared above, reuse it
          
          const adminMessage = `RENTAL CANCELLATION ALERT\n\n` +
            `Customer: ${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}\n` +
            `Email: ${user?.email || 'N/A'}\n` +
            `Phone: ${user?.profile?.phone || 'N/A'}\n\n` +
            `Cancelled Rental:\n` +
            `• Rental ID: ${rentalIdFormatted}\n` +
            `• Vehicle: ${car.year} ${car.make} ${car.model}\n` +
            `• License Plate: ${car.licensePlate || 'N/A'}\n` +
            `• Check-out Date: ${rental.checkOutDate ? new Date(rental.checkOutDate).toLocaleDateString() : 'Not checked out'}\n` +
            `• Expected Return: ${rental.expectedReturnDate ? new Date(rental.expectedReturnDate).toLocaleDateString() : 'N/A'}\n` +
            `• Cancellation Date: ${new Date().toLocaleDateString()}\n\n` +
            `Vehicle Status:\n` +
            `• Vehicle is now available for other bookings\n` +
            `• Any pending charges should be reviewed`;
          
          await broadcastToAdmins({
            type: 'rental_status',
            subject: 'Rental Cancelled',
            message: adminMessage,
            priority: 'high',
            isAdminCopy: true,
            relatedRentalId: rental._id
          });
        }
        // Generic status update notifications removed - specific notifications are sent for each status type above
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }).catch(err => console.error('Notification promise error:', err));

    // Response already sent above before notifications
  } catch (error) {
    res.status(500).json({ message: 'Error updating rental status', error: error.message });
  }
};

// Get user rentals
exports.getUserRentals = async (req, res) => {
  try {
    const userId = req.user.id;
    const rentals = await Rental.find({ user: userId })
      .populate('car', 'make model year imageUrls pricePerDay')
      .populate('booking', 'startDate endDate location')
      .sort({ createdAt: -1 });

    // Real-time overdue check for user rentals
    await checkAndUpdateOverdueRentals(rentals);

    res.json({
      success: true,
      data: rentals
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user rentals', error: error.message });
  }
};

// Get user's current active rentals
exports.getCurrentRentals = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentRentals = await Rental.find({ 
      user: userId, 
      rentalStatus: 'active' 
    })
      .populate('car', 'make model year imageUrls pricePerDay')
      .populate('booking', 'startDate endDate location')
      .populate('user', 'profile.firstName profile.lastName email')
      .sort({ checkOutDate: -1 });

    res.json({
      success: true,
      data: currentRentals
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current rentals', error: error.message });
  }
};

// Extend rental
exports.extendRental = async (req, res) => {
  try {
    const { id } = req.params;
    const { newEndDate, additionalDays } = req.body;
    const userId = req.user.id;

    const rental = await Rental.findOne({ _id: id, user: userId })
      .populate('car', 'pricePerDay')
      .populate('booking');

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    if (rental.rentalStatus !== 'active') {
      return res.status(400).json({ message: 'Only active rentals can be extended' });
    }

    // Calculate additional cost
    const dailyRate = rental.car.pricePerDay;
    const extensionCost = dailyRate * additionalDays;

    // Update rental
    rental.expectedReturnDate = new Date(newEndDate);
    rental.totalRentalFee += extensionCost;
    rental.notes = (rental.notes || '') + `\nExtended by ${additionalDays} days on ${new Date().toLocaleDateString()}`;

    await rental.save();

    // Update booking end date
    await Booking.findByIdAndUpdate(rental.booking._id, {
      endDate: new Date(newEndDate)
    });

    // Send response immediately - BEFORE notifications
    res.json({
      success: true,
      message: 'Rental extended successfully',
      data: rental,
      extensionCost
    });

    // Send notification in background - completely non-blocking
    // Response already sent above
    Promise.resolve().then(async () => {
      try {
        const Notification = require('../models/Notification');
        const message = `Your rental for ${rental.car.make} ${rental.car.model} has been extended until ${new Date(newEndDate).toLocaleDateString()}. Additional cost: ₱${extensionCost}`;
        
        // Create user notification directly
        const extendedNotif = await Notification.create({
          userId: userId,
          type: 'rental_extension',
          subject: 'Rental Extended',
          message: message,
          relatedRentalId: rental._id,
          priority: 'medium',
          seen: false
        });
        emitNotificationViaWebSocket(userId, extendedNotif);
        
        // Send email notification to customer
        const { sendEmailNotification } = require('./notificationController');
        await sendEmailNotification(
          userId,
          'Rental Extended - Car Rental System',
          message,
          'rentalExtension'
        ).catch(err => console.error('Customer email error:', err));
        
        // Send detailed admin notification for rental extension
        const userDoc = await User.findById(userId).select('profile.firstName profile.lastName email');
        const renterName = userDoc ? `${userDoc.profile.firstName} ${userDoc.profile.lastName}` : 'Customer';
        
        const adminMessage = `RENTAL EXTENSION: ${renterName} has extended their rental!

Extension Details:
• Vehicle: ${rental.car.year} ${rental.car.make} ${rental.car.model}
• Customer: ${renterName} (${userDoc?.email || 'N/A'})
• Original Return Date: ${new Date(rental.booking.endDate).toLocaleDateString()}
• New Return Date: ${new Date(newEndDate).toLocaleDateString()}
• Extension Period: ${additionalDays} day${additionalDays !== 1 ? 's' : ''}
• Daily Rate: ₱${dailyRate}
• Extension Cost: ₱${extensionCost}
• New Total Rental Fee: ₱${rental.totalRentalFee}

The booking and rental records have been automatically updated with the new return date.`;
        
        const adminSubject = `Rental Extension - ${renterName} (${rental.car.make} ${rental.car.model})`;
        
        // Get all admin users and create notifications using fast insertMany
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        if (adminUsers.length > 0) {
          const adminNotifications = adminUsers.map(admin => ({
            userId: admin._id,
            type: 'rental_extension',
            subject: adminSubject,
            message: adminMessage,
            relatedRentalId: rental._id,
            priority: 'medium',
            seen: false,
            isAdminCopy: true
          }));
          
          const insertedAdminNotifs = await Notification.insertMany(adminNotifications);
          insertedAdminNotifs.forEach(notif => emitNotificationViaWebSocket(notif.userId, notif));
        }
        
        // Send emails asynchronously (don't wait)
        sendEmailToAdmins(adminSubject, adminMessage).catch(err => 
          console.error('Email send error:', err)
        );
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }
    }).catch(err => console.error('Notification promise error:', err));

    // Response already sent above before notifications
  } catch (error) {
    res.status(500).json({ message: 'Error extending rental', error: error.message });
  }
};

// Submit rental review
exports.submitRentalReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const rental = await Rental.findOne({ _id: id, user: userId });

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    if (rental.rentalStatus !== 'completed') {
      return res.status(400).json({ message: 'Only completed rentals can be reviewed' });
    }

    // Add review to rental
    rental.review = {
      rating: parseInt(rating),
      comment: comment || '',
      reviewDate: new Date()
    };

    await rental.save();

    // Update car's average rating
    const carRentals = await Rental.find({ 
      car: rental.car, 
      'review.rating': { $exists: true } 
    });
    
    if (carRentals.length > 0) {
      const avgRating = carRentals.reduce((sum, r) => sum + r.review.rating, 0) / carRentals.length;
      await Car.findByIdAndUpdate(rental.car, { 
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: carRentals.length
      });
    }

    res.json({
      success: true,
      message: 'Review submitted successfully',
      data: rental.review
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting review', error: error.message });
  }
};

// Generate rental invoice (simplified)
exports.generateInvoice = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('user', 'email profile.firstName profile.lastName profile.phone')
      .populate('car', 'make model year pricePerDay')
      .populate('booking', 'startDate endDate location');

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Create invoice data
    const invoice = {
      rentalId: rental._id,
      customer: {
        name: `${rental.user.profile.firstName} ${rental.user.profile.lastName}`,
        email: rental.user.email,
      },
      car: {
        make: rental.car.make,
        model: rental.car.model,
        year: rental.car.year,
      },
      dates: {
        checkOut: rental.checkOutDate,
        checkIn: rental.checkInDate,
      },
      booking: {
        startDate: rental.booking.startDate,
        endDate: rental.booking.endDate,
        location: rental.booking.location,
      },
      fees: {
        rentalFee: rental.totalRentalFee,
        lateFee: rental.lateFee,
        damageFee: rental.damageFee,
        total: rental.calculateTotalFees(),
      },
      createdAt: rental.createdAt,
    };

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error generating invoice', error: error.message });
  }
};

// Generate and download rental invoice PDF (streamed)
const PDFDocument = require('pdfkit');
exports.downloadInvoice = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('user', 'email profile.firstName profile.lastName profile.phone')
      .populate('car', 'make model year pricePerDay')
      .populate('booking', 'startDate endDate location');

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Create invoice data
    const invoice = {
      rentalId: rental._id,
      customer: {
        name: `${rental.user.profile.firstName} ${rental.user.profile.lastName}`,
        email: rental.user.email,
      },
      car: {
        make: rental.car.make,
        model: rental.car.model,
        year: rental.car.year,
      },
      dates: {
        checkOut: rental.checkOutDate,
        checkIn: rental.checkInDate,
      },
      booking: {
        startDate: rental.booking.startDate,
        endDate: rental.booking.endDate,
        location: rental.booking.location,
      },
      fees: {
        rentalFee: rental.totalRentalFee,
        lateFee: rental.lateFee,
        damageFee: rental.damageFee,
        total: rental.calculateTotalFees(),
      },
      createdAt: rental.createdAt,
    };

    // Generate PDF in-memory and send as buffer
    const filename = `rental_invoice_${rental._id}.pdf`;
    const { PassThrough } = require('stream');
    const doc = new PDFDocument();
    const bufferStream = new PassThrough();
    const chunks = [];
    bufferStream.on('data', chunk => chunks.push(chunk));
    bufferStream.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(pdfBuffer);
    });

    // pipe pdf into buffer stream
    doc.pipe(bufferStream);

    // --- build PDF ---
    doc.fontSize(20).text('Rental Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Rental ID: ${invoice.rentalId}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Customer Information:');
    doc.fontSize(12);
    doc.text(`Name: ${invoice.customer.name}`);
    doc.text(`Email: ${invoice.customer.email}`);
    doc.moveDown();

    doc.fontSize(14).text('Car Information:');
    doc.fontSize(12);
    doc.text(`Make: ${invoice.car.make}`);
    doc.text(`Model: ${invoice.car.model}`);
    doc.text(`Year: ${invoice.car.year}`);
    doc.moveDown();

    doc.fontSize(14).text('Rental Dates:');
    doc.fontSize(12);
    doc.text(`Booking Period: ${new Date(invoice.booking.startDate).toLocaleDateString()} - ${new Date(invoice.booking.endDate).toLocaleDateString()}`);
    doc.text(`Check-out Date: ${new Date(invoice.dates.checkOut).toLocaleDateString()}`);
    if (invoice.dates.checkIn) {
      doc.text(`Check-in Date: ${new Date(invoice.dates.checkIn).toLocaleDateString()}`);
    }
    doc.moveDown();

    doc.fontSize(14).text('Location:');
    doc.fontSize(12).text(invoice.booking.location);
    doc.moveDown();

    doc.fontSize(14).text('Fees:');
    doc.fontSize(12).text(`Rental Fee: $${invoice.fees.rentalFee.toFixed(2)}`);
    if (invoice.fees.lateFee > 0) doc.text(`Late Fee: $${invoice.fees.lateFee.toFixed(2)}`);
    if (invoice.fees.damageFee > 0) doc.text(`Damage Fee: $${invoice.fees.damageFee.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(16).text(`Total: $${invoice.fees.total.toFixed(2)}`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for your business!', { align: 'center' });

    doc.end(); // triggers 'end' event

  } catch (error) {
    res.status(500).json({ message: 'Error generating invoice PDF', error: error.message });
  }
};

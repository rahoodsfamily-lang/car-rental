const Rental = require('../models/Rental');
const Car = require('../models/Car');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { emitToUser } = require('../socket/socketServer');
const { sendOverdueAlert, broadcastToAdmins, sendEmailToAdmins } = require('../controllers/notificationController');
const { formatBookingId, formatRentalId } = require('./idFormatter');
const { calculateEstimatedLateFee } = require('./lateFeeCalculator');

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

// Check for overdue rentals
const checkOverdueRentals = async () => {
  try {
    console.log('Checking for overdue rentals...');
    
    // Find all active rentals
    const now = new Date();
    const overdueRentals = await Rental.find({
      rentalStatus: 'active'
    }).populate('booking').populate('car');
    
    let overdueCount = 0;
    
    for (const rental of overdueRentals) {
      // Check if the rental is actually overdue based on booking endDate
      // Ensure booking exists and has valid endDate
      if (!rental.booking || !rental.booking.endDate) {
        console.log(`Skipping rental ${rental._id} - missing booking or endDate`);
        continue;
      }
      
      const bookingEndDate = new Date(rental.booking.endDate);
      if (isNaN(bookingEndDate.getTime())) {
        console.log(`Skipping rental ${rental._id} - invalid booking endDate`);
        continue;
      }
      
      if (bookingEndDate < now) {
        // Calculate and set estimated late fee for tracking purposes
        let estimatedLateFee = 0;
        if (rental.car && rental.car.pricePerDay) {
          try {
            const lateFeeInfo = calculateEstimatedLateFee(
              bookingEndDate,
              rental.car.pricePerDay,
              now
            );
            estimatedLateFee = lateFeeInfo.totalLateFee;
            console.log(`[OVERDUE] Calculated estimated late fee for rental ${rental._id}: ₱${estimatedLateFee} (${lateFeeInfo.daysOverdue} days)`);
          } catch (error) {
            console.error('[ERROR] Failed to calculate estimated late fee:', error);
          }
        }
        
        // Update rental status to overdue and set estimated late fee
        rental.rentalStatus = 'overdue';
        // Only update lateFee if it's currently 0 (not manually set)
        if (rental.lateFee === 0) {
          rental.lateFee = estimatedLateFee;
        }
        await rental.save();
        
        // Fetch user separately with proper field selection
        // rental.user is just an ID since we didn't populate it
        const userId = typeof rental.user === 'string' ? rental.user : rental.user?._id;
        
        // Debug: fetch full user first
        const fullUser = await User.findById(userId);
        console.log('[OVERDUE DEBUG] Full user profile:', fullUser?.profile);
        console.log('[OVERDUE DEBUG] Phone exists?', !!fullUser?.profile?.phone);
        console.log('[OVERDUE DEBUG] Phone value:', fullUser?.profile?.phone);
        
        const user = await User.findById(userId).select('profile.firstName profile.lastName profile.phone email');
        
        // Send overdue alert notification
        try {
          // bookingEndDate already declared above, reuse it
          const daysOverdue = Math.max(1, Math.ceil((now - bookingEndDate) / (1000 * 60 * 60 * 24)));
          const lateFeePerDay = (rental.car?.pricePerDay || 0) * 0.2; // 20% late fee per day
          const estimatedLateFee = lateFeePerDay * daysOverdue;
          
          // User notification
          const carInfo = rental.car ? `${rental.car.year} ${rental.car.make} ${rental.car.model}` : 'Vehicle';
          const message = `URGENT: Your rental for ${carInfo} is now OVERDUE!

Overdue Alert Details:
• Vehicle: ${carInfo}
• Original Return Date: ${bookingEndDate.toLocaleDateString()}
• Current Date: ${now.toLocaleDateString()}
• Days Overdue: ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}
• Daily Late Fee: ₱${lateFeePerDay.toFixed(2)} (20% of daily rate ₱${rental.car?.pricePerDay || 0})
• Current Late Fee Accumulated: ₱${estimatedLateFee.toFixed(2)}

ACTION REQUIRED: Please return the vehicle IMMEDIATELY to avoid additional late fees. The late fee increases by ₱${lateFeePerDay.toFixed(2)} for each additional day the vehicle is not returned.

If you need to extend your rental period, please contact us immediately at our customer service or use the "Extend Rental" option in your dashboard.

This is an automated reminder. Failure to return the vehicle may result in additional penalties and legal action.`;
          
          // Send overdue alert notification and email to customer
          // This creates the notification and sends email in one call
          try {
            await sendOverdueAlert(rental.user, rental._id, message);
            console.log(`Overdue notification and email sent to customer for rental ${rental._id}`);
          } catch (emailError) {
            console.error('Failed to send overdue alert to customer:', emailError);
          }
          
          // Send detailed admin notification
          // User already fetched above with profile.phone
          console.log('[DEBUG] Overdue - User data:', {
            userType: typeof user,
            userId: user?._id,
            email: user?.email,
            profilePhone: user?.profile?.phone,
            hasProfile: !!user?.profile,
            profileData: user?.profile,
            firstName: user?.profile?.firstName,
            lastName: user?.profile?.lastName
          });
          
          // Fallback if user is somehow not populated
          if (!user || !user.profile) {
            console.error('[ERROR] User not properly populated for rental:', rental._id);
          }
          const renterName = user ? `${user.profile.firstName} ${user.profile.lastName}` : 'Customer';
          
          // carInfo already declared above, reuse it
          const checkOutDateStr = rental.checkOutDate && !isNaN(new Date(rental.checkOutDate).getTime()) 
            ? new Date(rental.checkOutDate).toLocaleDateString() 
            : 'N/A';
          
          // Log right before message creation
          console.log('[DEBUG] About to create message with phone:', user?.profile?.phone);
          console.log('[DEBUG] Full user object:', JSON.stringify(user?.profile, null, 2));
          
          const adminMessage = `AUTOMATED OVERDUE ALERT: ${renterName} has not returned the vehicle!

System-Detected Overdue Rental:
• Vehicle: ${carInfo}
• Customer: ${renterName}
• Email: ${user?.email || 'N/A'}
• Phone: ${user?.profile?.phone || 'N/A'}
• Check-out Date: ${checkOutDateStr}
• Original Return Date: ${bookingEndDate.toLocaleDateString()}
• Detection Time: ${now.toLocaleString()}
• Days Overdue: ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}

Financial Impact:
• Daily Rental Rate: ₱${rental.car?.pricePerDay || 0}
• Daily Late Fee: ₱${lateFeePerDay.toFixed(2)} (20% penalty)
• Current Late Fees: ₱${estimatedLateFee.toFixed(2)}
• Lost Revenue Potential: ₱${rental.car?.pricePerDay || 0}/day (vehicle unavailable)

IMMEDIATE ACTION REQUIRED:
1. Contact customer via phone: ${user?.profile?.phone || 'No phone on file'}
2. Send formal overdue notice via email
3. Update rental status to 'overdue' in system
4. ${daysOverdue > 3 ? 'Consider escalation procedures' : 'Monitor for response within 24 hours'}
5. ${daysOverdue > 7 ? 'CRITICAL: Initiate recovery procedures' : ''}

This is an automated system alert generated during routine overdue checks.

Rental ID: ${rental.rentalId || formatRentalId(rental._id)}
Booking ID: ${rental.booking?.bookingId || formatBookingId(rental.booking?._id || rental.booking)}`;
          
          const alertSubject = `AUTOMATED ALERT - Overdue: ${renterName} (${rental.car.make} ${rental.car.model}) - Day ${daysOverdue}`;
          
          // Get all admin users and create notifications using fast insertMany
          const adminUsers = await User.find({ role: 'admin' }).select('_id');
          if (adminUsers.length > 0) {
            const adminNotifications = adminUsers.map(admin => ({
              userId: admin._id,
              type: 'overdue_alert',
              subject: alertSubject,
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
          sendEmailToAdmins(alertSubject, adminMessage).catch(err => 
            console.error('Email send error:', err)
          );
          
          overdueCount++;
        } catch (notificationError) {
          console.error('Error sending overdue notification:', notificationError);
        }
      }
    }
    
    console.log(`Overdue rental check completed. ${overdueCount} alerts sent.`);
  } catch (error) {
    console.error('Error checking overdue rentals:', error);
  }
};

module.exports = { checkOverdueRentals };

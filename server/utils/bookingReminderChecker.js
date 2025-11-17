const Booking = require('../models/Booking');
const { sendBookingReminder } = require('../controllers/notificationController');

// Check for upcoming bookings and send reminders
const checkBookingReminders = async () => {
  try {
    console.log('Checking for booking reminders...');
    
    // Find bookings that are confirmed and starting within 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const upcomingBookings = await Booking.find({
      status: 'confirmed',
      startDate: { $gte: now, $lte: tomorrow }
    }).populate('user').populate('car');
    
    let reminderCount = 0;
    
    for (const booking of upcomingBookings) {
      try {
        // Calculate time details
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        const hoursUntilDelivery = Math.ceil((startDate - now) / (1000 * 60 * 60));
        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const bookingId = booking.bookingId || `BKG-${booking._id.toString().slice(-5).toUpperCase()}`;
        
        // Create detailed customer message
        const message = `BOOKING REMINDER - Your rental is coming up soon!

Booking Details:
• Booking ID: ${bookingId}
• Vehicle: ${booking.car.year || ''} ${booking.car.make} ${booking.car.model}
• Delivery Time: ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}
• Return Date: ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}
• Duration: ${duration} day${duration !== 1 ? 's' : ''}
• Delivery Location: ${booking.location || 'Main Office'}
• Time Until Delivery: ${hoursUntilDelivery} hour${hoursUntilDelivery !== 1 ? 's' : ''}

Payment Information:
• Total Amount: ₱${booking.totalAmount || booking.totalPrice || 'To be confirmed'}
• Payment Status: ${booking.paymentStatus || 'Pending'}
• Payment Method: ${booking.paymentMethod || 'To be selected'}

What to Bring:
• Valid driver's license
• Government-issued ID
• Proof of insurance (if applicable)
• Credit card or cash for deposit
• This booking confirmation

Important Reminders:
• Please be available 15 minutes before your scheduled delivery time
• Not being available may result in cancellation
• Fuel policy: Return with same fuel level
• Check vehicle condition during delivery
• Report any issues immediately

Need Help?
If you need to modify or cancel your booking, please contact us immediately.

Thank you for choosing our car rental service! We look forward to serving you.`;
        
        // Send booking reminder notification
        await sendBookingReminder(
          booking.user._id,
          booking._id,
          message
        );
        
        reminderCount++;
      } catch (notificationError) {
        console.error('Error sending booking reminder:', notificationError);
      }
    }
    
    console.log(`Booking reminder check completed. ${reminderCount} reminders sent.`);
  } catch (error) {
    console.error('Error checking booking reminders:', error);
  }
};

module.exports = { checkBookingReminders };

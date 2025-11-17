/**
 * Rental System Configuration
 * 
 * This file contains the core business rules for the car rental system,
 * including operating hours and booking restrictions.
 */

const RENTAL_CONFIG = {
  // Operating hours (24-hour format)
  OPERATING_HOURS: {
    OPEN: 8,   // 8:00 AM
    CLOSE: 17  // 5:00 PM (17:00)
  },

  // Booking restrictions
  BOOKING_RULES: {
    // After closing time (5:00 PM), customers cannot book for today
    // They can only book for tomorrow or later
    CUTOFF_TIME: 17  // 5:00 PM (17:00)
  }
};

/**
 * Get the minimum allowed booking date based on current time
 * @returns {Date} The minimum date that can be booked
 */
const getMinimumBookingDate = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's after 5:00 PM (17:00), minimum booking date is tomorrow
  if (currentHour >= RENTAL_CONFIG.BOOKING_RULES.CUTOFF_TIME) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  
  // Before 5:00 PM, can book for today
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Check if a booking date is valid based on current time
 * @param {Date|string} bookingDate - The proposed booking start date
 * @returns {boolean} True if the date is valid for booking
 */
const isValidBookingDate = (bookingDate) => {
  const minDate = getMinimumBookingDate();
  const proposedDate = new Date(bookingDate);
  proposedDate.setHours(0, 0, 0, 0);
  
  return proposedDate >= minDate;
};

/**
 * Get a user-friendly message about booking restrictions
 * @returns {string} Message explaining current booking restrictions
 */
const getBookingRestrictionMessage = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  if (currentHour >= RENTAL_CONFIG.BOOKING_RULES.CUTOFF_TIME) {
    return 'Bookings for today are no longer available after 5:00 PM. You can book for tomorrow or any future date.';
  }
  
  return 'You can book for today or any future date until 5:00 PM.';
};

/**
 * Check if current time is within operating hours
 * @returns {boolean} True if currently within operating hours
 */
const isWithinOperatingHours = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  return currentHour >= RENTAL_CONFIG.OPERATING_HOURS.OPEN && 
         currentHour < RENTAL_CONFIG.OPERATING_HOURS.CLOSE;
};

module.exports = {
  RENTAL_CONFIG,
  getMinimumBookingDate,
  isValidBookingDate,
  getBookingRestrictionMessage,
  isWithinOperatingHours
};

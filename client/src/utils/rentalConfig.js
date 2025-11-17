/**
 * Rental System Configuration (Frontend)
 * 
 * This file contains the core business rules for the car rental system,
 * including operating hours and booking restrictions.
 * Must match server/config/rentalConfig.js
 */

import dayjs from 'dayjs';

export const RENTAL_CONFIG = {
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
 * @returns {dayjs.Dayjs} The minimum date that can be booked
 */
export const getMinimumBookingDate = () => {
  const now = dayjs();
  const currentHour = now.hour();
  
  // If it's after 5:00 PM (17:00), minimum booking date is tomorrow
  if (currentHour >= RENTAL_CONFIG.BOOKING_RULES.CUTOFF_TIME) {
    return now.add(1, 'day').startOf('day');
  }
  
  // Before 5:00 PM, can book for today
  return now.startOf('day');
};

/**
 * Check if a booking date is valid based on current time
 * @param {dayjs.Dayjs|Date|string} bookingDate - The proposed booking start date
 * @returns {boolean} True if the date is valid for booking
 */
export const isValidBookingDate = (bookingDate) => {
  if (!bookingDate) return false;
  
  const minDate = getMinimumBookingDate();
  const proposedDate = dayjs(bookingDate).startOf('day');
  
  return proposedDate.isSameOrAfter(minDate);
};

/**
 * Get a user-friendly message about booking restrictions
 * @returns {string} Message explaining current booking restrictions
 */
export const getBookingRestrictionMessage = () => {
  const now = dayjs();
  const currentHour = now.hour();
  
  if (currentHour >= RENTAL_CONFIG.BOOKING_RULES.CUTOFF_TIME) {
    return 'Bookings for today are no longer available after 5:00 PM. You can book for tomorrow or any future date.';
  }
  
  return 'You can book for today or any future date until 5:00 PM.';
};

/**
 * Check if current time is within operating hours
 * @returns {boolean} True if currently within operating hours
 */
export const isWithinOperatingHours = () => {
  const now = dayjs();
  const currentHour = now.hour();
  
  return currentHour >= RENTAL_CONFIG.OPERATING_HOURS.OPEN && 
         currentHour < RENTAL_CONFIG.OPERATING_HOURS.CLOSE;
};

/**
 * Get formatted operating hours string
 * @returns {string} Operating hours in readable format
 */
export const getOperatingHoursString = () => {
  return `${RENTAL_CONFIG.OPERATING_HOURS.OPEN}:00 AM – ${RENTAL_CONFIG.OPERATING_HOURS.CLOSE % 12 || 12}:00 PM`;
};

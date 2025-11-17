/**
 * Utility functions for formatting data consistently across the application
 */

/**
 * Formats a MongoDB ObjectId into a human-readable booking ID
 * @param {string} id - The MongoDB ObjectId
 * @param {string} prefix - The prefix to use (default: 'BKG')
 * @returns {string} - Formatted ID like 'BKG-10234'
 */
export const formatBookingId = (id, prefix = 'BKG') => {
  if (!id) return 'N/A';
  
  // Extract last 8 characters of the ID
  const shortId = id.slice(-8);
  
  // Convert hex to a numeric format for better readability
  // Take first 5 characters and convert to base 10
  const numericId = parseInt(shortId.substring(0, 5), 16) % 100000;
  
  // Format with leading zeros to ensure consistent length
  const formattedNumber = numericId.toString().padStart(5, '0');
  
  return `${prefix}-${formattedNumber}`;
};

/**
 * Formats a rental ID
 * @param {string} id - The MongoDB ObjectId
 * @returns {string} - Formatted ID like 'RNT-10234'
 */
export const formatRentalId = (id) => {
  return formatBookingId(id, 'RNT');
};

/**
 * Formats a user ID
 * @param {string} id - The MongoDB ObjectId
 * @returns {string} - Formatted ID like 'USR-10234'
 */
export const formatUserId = (id) => {
  return formatBookingId(id, 'USR');
};

/**
 * Formats a car ID
 * @param {string} id - The MongoDB ObjectId
 * @returns {string} - Formatted ID like 'CAR-10234'
 */
export const formatCarId = (id) => {
  return formatBookingId(id, 'CAR');
};

/**
 * Formats currency values
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency symbol (default: '₱')
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = '₱') => {
  if (amount === null || amount === undefined) return `${currency}0`;
  return `${currency}${amount.toLocaleString()}`;
};

/**
 * Formats date to a readable string
 * @param {string|Date} date - The date to format
 * @param {boolean} includeTime - Whether to include time (default: false)
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  
  if (includeTime) {
    return dateObj.toLocaleString();
  }
  
  return dateObj.toLocaleDateString();
};

/**
 * Formats date range
 * @param {string|Date} startDate - The start date
 * @param {string|Date} endDate - The end date
 * @returns {string} - Formatted date range string
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A';
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

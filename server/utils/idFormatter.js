/**
 * Utility functions for formatting MongoDB IDs into human-readable formats
 * This mirrors the client-side formatters for consistency
 */

/**
 * Formats a MongoDB ObjectId into a human-readable ID with prefix
 * @param {string|Object} id - The MongoDB ObjectId (string or ObjectId object)
 * @param {string} prefix - The prefix to use (e.g., 'BKG', 'RNT')
 * @returns {string} - Formatted ID like 'BKG-10234'
 */
const formatId = (id, prefix = 'ID') => {
  if (!id) return 'N/A';
  
  // Convert ObjectId to string if needed
  const idString = id.toString ? id.toString() : String(id);
  
  // Extract last 8 characters of the ID
  const shortId = idString.slice(-8);
  
  // Convert hex to a numeric format for better readability
  // Take first 5 characters and convert to base 10
  const numericId = parseInt(shortId.substring(0, 5), 16) % 100000;
  
  // Format with leading zeros to ensure consistent length
  const formattedNumber = numericId.toString().padStart(5, '0');
  
  return `${prefix}-${formattedNumber}`;
};

/**
 * Formats a booking ID
 * @param {string|Object} id - The MongoDB ObjectId
 * @returns {string} - Formatted ID like 'BKG-10234'
 */
const formatBookingId = (id) => {
  return formatId(id, 'BKG');
};

/**
 * Formats a rental ID
 * @param {string|Object} id - The MongoDB ObjectId
 * @returns {string} - Formatted ID like 'RNT-10234'
 */
const formatRentalId = (id) => {
  return formatId(id, 'RNT');
};

/**
 * Formats a user ID
 * @param {string|Object} id - The MongoDB ObjectId
 * @returns {string} - Formatted ID like 'USR-10234'
 */
const formatUserId = (id) => {
  return formatId(id, 'USR');
};

/**
 * Formats a car ID
 * @param {string|Object} id - The MongoDB ObjectId
 * @returns {string} - Formatted ID like 'CAR-10234'
 */
const formatCarId = (id) => {
  return formatId(id, 'CAR');
};

module.exports = {
  formatId,
  formatBookingId,
  formatRentalId,
  formatUserId,
  formatCarId
};

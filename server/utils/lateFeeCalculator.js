// utils/lateFeeCalculator.js
// Utility functions for calculating late fees for overdue rentals

/**
 * Calculate late fee for an overdue rental
 * @param {Date} expectedReturnDate - The original return date from booking
 * @param {Date} actualReturnDate - The actual return date (check-in date)
 * @param {Number} dailyRate - The daily rental rate of the car
 * @param {Number} lateFeePercentage - The late fee percentage (default: 0.2 = 20%)
 * @returns {Object} - Object containing days overdue and calculated late fee
 */
const calculateLateFee = (expectedReturnDate, actualReturnDate, dailyRate, lateFeePercentage = 0.2) => {
  // Ensure dates are Date objects
  const expectedDate = new Date(expectedReturnDate);
  const actualDate = new Date(actualReturnDate);
  
  // Validate inputs
  if (isNaN(expectedDate.getTime()) || isNaN(actualDate.getTime())) {
    throw new Error('Invalid date provided for late fee calculation');
  }
  
  if (!dailyRate || dailyRate <= 0) {
    throw new Error('Invalid daily rate provided for late fee calculation');
  }
  
  // Calculate days overdue (minimum 0)
  const timeDifference = actualDate.getTime() - expectedDate.getTime();
  const daysOverdue = Math.max(0, Math.ceil(timeDifference / (1000 * 60 * 60 * 24)));
  
  // Calculate late fee
  const lateFeePerDay = dailyRate * lateFeePercentage;
  const totalLateFee = lateFeePerDay * daysOverdue;
  
  return {
    daysOverdue,
    lateFeePerDay,
    totalLateFee: Math.round(totalLateFee * 100) / 100, // Round to 2 decimal places
    isOverdue: daysOverdue > 0
  };
};

/**
 * Calculate estimated late fee for an active overdue rental
 * @param {Date} expectedReturnDate - The original return date from booking
 * @param {Number} dailyRate - The daily rental rate of the car
 * @param {Date} currentDate - Current date (default: now)
 * @param {Number} lateFeePercentage - The late fee percentage (default: 0.2 = 20%)
 * @returns {Object} - Object containing days overdue and estimated late fee
 */
const calculateEstimatedLateFee = (expectedReturnDate, dailyRate, currentDate = new Date(), lateFeePercentage = 0.2) => {
  return calculateLateFee(expectedReturnDate, currentDate, dailyRate, lateFeePercentage);
};

/**
 * Format late fee information for display
 * @param {Object} lateFeeInfo - Result from calculateLateFee function
 * @param {String} currency - Currency symbol (default: '₱')
 * @returns {Object} - Formatted late fee information
 */
const formatLateFeeInfo = (lateFeeInfo, currency = '₱') => {
  const { daysOverdue, lateFeePerDay, totalLateFee, isOverdue } = lateFeeInfo;
  
  return {
    ...lateFeeInfo,
    formattedLateFeePerDay: `${currency}${lateFeePerDay.toFixed(2)}`,
    formattedTotalLateFee: `${currency}${totalLateFee.toFixed(2)}`,
    overdueMessage: isOverdue 
      ? `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`
      : 'Returned on time',
    lateFeeMessage: isOverdue
      ? `Late fee: ${currency}${totalLateFee.toFixed(2)} (${daysOverdue} × ${currency}${lateFeePerDay.toFixed(2)}/day)`
      : 'No late fee - returned on time'
  };
};

module.exports = {
  calculateLateFee,
  calculateEstimatedLateFee,
  formatLateFeeInfo
};

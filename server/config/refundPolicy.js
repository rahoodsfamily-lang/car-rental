/**
 * Refund Policy Configuration
 * 
 * Defines the refund rules for cancelled bookings based on cancellation timing
 */

const REFUND_POLICY = {
  // Refund percentages based on hours before pickup
  RULES: [
    {
      hoursBeforePickup: 24,
      refundPercentage: 100,
      description: 'Full refund (100%) - Cancelled 24+ hours before pickup'
    },
    {
      hoursBeforePickup: 12,
      refundPercentage: 50,
      description: 'Partial refund (50%) - Cancelled 12-24 hours before pickup'
    },
    {
      hoursBeforePickup: 0,
      refundPercentage: 0,
      description: 'No refund - Cancelled less than 12 hours before pickup'
    }
  ],

  // Special cases
  SPECIAL_CASES: {
    // No refund if pickup time has passed
    AFTER_PICKUP: {
      refundPercentage: 0,
      description: 'No refund - Pickup time has passed'
    },
    // Cash payments that haven't been collected yet
    CASH_NOT_COLLECTED: {
      refundPercentage: 0,
      description: 'No refund needed - Cash payment not yet collected'
    }
  }
};

/**
 * Calculate refund amount based on cancellation timing
 * @param {Number} paymentAmount - Original payment amount
 * @param {Date} pickupDate - Scheduled pickup date
 * @param {Date} cancellationDate - Date of cancellation (defaults to now)
 * @param {String} paymentMethod - Payment method (gcash, paymaya, cash)
 * @param {String} paymentStatus - Payment status (pending, verified, rejected)
 * @returns {Object} { refundAmount, refundPercentage, reason }
 */
const calculateRefundAmount = (paymentAmount, pickupDate, cancellationDate = new Date(), paymentMethod, paymentStatus) => {
  // Cash payments are collected on delivery, so no refund is ever needed
  if (paymentMethod === 'cash') {
    return {
      refundAmount: 0,
      refundPercentage: 0,
      reason: 'No refund needed - Cash is paid on delivery',
      requiresRefund: false
    };
  }

  // If payment is pending (not verified), no refund needed (booking not confirmed)
  if (paymentStatus === 'pending') {
    return {
      refundAmount: 0,
      refundPercentage: 0,
      reason: 'No refund needed - Payment not yet verified',
      requiresRefund: false
    };
  }

  // Calculate hours until pickup
  const hoursUntilPickup = (new Date(pickupDate) - new Date(cancellationDate)) / (1000 * 60 * 60);

  // If pickup time has passed
  if (hoursUntilPickup < 0) {
    return {
      refundAmount: 0,
      refundPercentage: 0,
      reason: REFUND_POLICY.SPECIAL_CASES.AFTER_PICKUP.description,
      requiresRefund: true
    };
  }

  // Find applicable refund rule
  let applicableRule = REFUND_POLICY.RULES[REFUND_POLICY.RULES.length - 1]; // Default to no refund
  
  for (const rule of REFUND_POLICY.RULES) {
    if (hoursUntilPickup >= rule.hoursBeforePickup) {
      applicableRule = rule;
      break;
    }
  }

  const refundAmount = (paymentAmount * applicableRule.refundPercentage) / 100;

  return {
    refundAmount: Math.round(refundAmount * 100) / 100, // Round to 2 decimal places
    refundPercentage: applicableRule.refundPercentage,
    reason: applicableRule.description,
    requiresRefund: refundAmount > 0,
    hoursUntilPickup: Math.round(hoursUntilPickup * 10) / 10 // Round to 1 decimal place
  };
};

/**
 * Get refund policy description for display to users
 * @returns {String} Formatted refund policy description
 */
const getRefundPolicyDescription = () => {
  return `
Refund Policy:
• Cancel 24+ hours before pickup: 100% refund
• Cancel 12-24 hours before pickup: 50% refund
• Cancel less than 12 hours before pickup: No refund
• Cancel after pickup time: No refund

Note: Refunds are processed manually within 3-5 business days.
  `.trim();
};

/**
 * Get refund policy rules for admin display
 * @returns {Array} Array of refund rules
 */
const getRefundPolicyRules = () => {
  return REFUND_POLICY.RULES.map(rule => ({
    hoursBeforePickup: rule.hoursBeforePickup,
    refundPercentage: rule.refundPercentage,
    description: rule.description
  }));
};

module.exports = {
  REFUND_POLICY,
  calculateRefundAmount,
  getRefundPolicyDescription,
  getRefundPolicyRules
};

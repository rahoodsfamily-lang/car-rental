const Rental = require('../models/Rental');

/**
 * Real-time overdue check utility
 * Can be called from any controller to ensure rentals are up-to-date
 */
const checkAndUpdateOverdueRentals = async (rentals = null) => {
  try {
    // If no rentals provided, fetch all active rentals
    let rentalsToCheck = rentals;
    if (!rentalsToCheck) {
      rentalsToCheck = await Rental.find({ rentalStatus: 'active' }).populate('booking');
    }

    const now = new Date();
    let updatedCount = 0;
    const updatedRentals = [];

    for (const rental of rentalsToCheck) {
      if (rental.rentalStatus === 'active' && rental.booking && rental.booking.endDate) {
        const endDate = new Date(rental.booking.endDate);
        if (endDate < now) {
          console.log(`[REAL-TIME OVERDUE] Rental ${rental._id} is overdue by ${Math.ceil((now - endDate) / (1000 * 60 * 60 * 24))} days`);
          rental.rentalStatus = 'overdue';
          await rental.save();
          updatedCount++;
          updatedRentals.push(rental._id);
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`[REAL-TIME OVERDUE] Updated ${updatedCount} rentals to overdue status:`, updatedRentals);
    }

    return { updatedCount, updatedRentals };
  } catch (error) {
    console.error('Error in real-time overdue check:', error);
    return { updatedCount: 0, updatedRentals: [], error: error.message };
  }
};

module.exports = { checkAndUpdateOverdueRentals };

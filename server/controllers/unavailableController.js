const Booking = require('../models/Booking');

// Get unavailable date ranges for a specific car (pending or confirmed bookings)
// GET /api/bookings/car/:carId/unavailable
exports.getUnavailableDates = async (req, res) => {
  try {
    const { carId } = req.params;
    if (!carId) {
      return res.status(400).json({ success: false, message: 'carId param is required' });
    }

    const bookings = await Booking.find({
      car: carId,
      status: { $in: ['pending', 'confirmed', 'rented', 'active'] },
    }).select('startDate endDate');

    const ranges = bookings.map((b) => ({
      startDate: b.startDate,
      endDate: b.endDate,
    }));

    res.json({ success: true, data: ranges });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching unavailable dates', error: error.message });
  }
};

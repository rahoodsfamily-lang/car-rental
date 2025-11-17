const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but ensure uniqueness when present
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'cancelled', 'completed'],
    default: 'pending',
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  pickupLocation: {
    type: String,
    trim: true,
  },
  returnLocation: {
    type: String,
    trim: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'bank_transfer'],
  },
  notes: {
    type: String,
    trim: true,
  },
  cancellationReason: {
    type: String,
    trim: true,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate bookingId and update the updatedAt field before saving
bookingSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();
  
  // Generate bookingId if it doesn't exist
  if (!this.bookingId && this.isNew) {
    // Generate a random 5-digit number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.bookingId = `BKG-${randomNum}`;
    
    // Check if this ID already exists
    const Booking = this.constructor;
    let existingBooking = await Booking.findOne({ bookingId: this.bookingId });
    
    // If it exists, keep generating new ones until we find a unique one
    while (existingBooking) {
      const newRandomNum = Math.floor(10000 + Math.random() * 90000);
      this.bookingId = `BKG-${newRandomNum}`;
      existingBooking = await Booking.findOne({ bookingId: this.bookingId });
    }
  }
  
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);

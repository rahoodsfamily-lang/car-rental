const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  rentalId: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but ensure uniqueness when present
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  checkOutDate: {
    type: Date,
    required: true,
  },
  checkInDate: {
    type: Date,
    default: null,
  },
  rentalStatus: {
    type: String,
    enum: ['active', 'completed', 'overdue', 'cancelled'],
    default: 'active',
  },
  totalRentalFee: {
    type: Number,
    required: true,
    min: 0,
  },
  lateFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  damageFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
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

// Calculate total fees including base rental fee, late fee, and damage fee
rentalSchema.methods.calculateTotalFees = function() {
  // Keep the base rental fee and add any additional fees
  const baseFee = this.totalRentalFee || 0;
  const additionalFees = (this.lateFee || 0) + (this.damageFee || 0);
  
  // Don't overwrite totalRentalFee, just return the total
  return baseFee + additionalFees;
};

// Generate rentalId and update the updatedAt field before saving
rentalSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();
  
  // Generate rentalId if it doesn't exist
  if (!this.rentalId && this.isNew) {
    // Generate a random 5-digit number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.rentalId = `RNT-${randomNum}`;
    
    // Check if this ID already exists
    const Rental = this.constructor;
    let existingRental = await Rental.findOne({ rentalId: this.rentalId });
    
    // If it exists, keep generating new ones until we find a unique one
    while (existingRental) {
      const newRandomNum = Math.floor(10000 + Math.random() * 90000);
      this.rentalId = `RNT-${newRandomNum}`;
      existingRental = await Rental.findOne({ rentalId: this.rentalId });
    }
  }
  
  next();
});

module.exports = mongoose.model('Rental', rentalSchema);

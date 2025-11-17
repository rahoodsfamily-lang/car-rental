const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  carId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true,
  },
  rentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: true, // Only users who have rented the car can review
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  pros: [{
    type: String,
    trim: true,
    maxlength: 200,
  }],
  cons: [{
    type: String,
    trim: true,
    maxlength: 200,
  }],
  wouldRecommend: {
    type: Boolean,
    default: true,
  },
  verified: {
    type: Boolean,
    default: true, // Since it's tied to a rental, it's automatically verified
  },
  helpfulVotes: {
    type: Number,
    default: 0,
  },
  reportedCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'reported'],
    default: 'active',
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

// Compound index to ensure one review per user per rental
reviewSchema.index({ userId: 1, rentalId: 1 }, { unique: true });

// Index for efficient querying
reviewSchema.index({ carId: 1, status: 1, createdAt: -1 });

// Update the updatedAt field before saving
reviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for user's full name
reviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for car details
reviewSchema.virtual('car', {
  ref: 'Car',
  localField: 'carId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for rental details
reviewSchema.virtual('rental', {
  ref: 'Rental',
  localField: 'rentalId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema);

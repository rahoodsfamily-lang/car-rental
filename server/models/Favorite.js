const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  notes: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user can only favorite a car once
favoriteSchema.index({ user: 1, car: 1 }, { unique: true });

// Index for faster queries
favoriteSchema.index({ user: 1, createdAt: -1 });
favoriteSchema.index({ car: 1 });

module.exports = mongoose.model('Favorite', favoriteSchema);

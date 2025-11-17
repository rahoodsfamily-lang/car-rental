const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  make: {
    type: String,
    required: true,
    trim: true,
  },
  model: {
    type: String,
    required: true,
    trim: true,
  },
  trim: {
    type: String,
    trim: true,
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1,
  },
  pricePerDay: {
    type: Number,
    required: true,
    min: 0,
  },
  pricePerWeek: {
    type: Number,
    min: 0,
  },
  pricePerMonth: {
    type: Number,
    min: 0,
  },
  specifications: {
    type: Map,
    of: String,
    default: {},
  },
  availableFrom: Date,
  availableTo: Date,
  fuelType: { type: String, enum: ['Gas', 'Electric', 'Hybrid'] },
  transmission: { type: String, enum: ['Automatic', 'Manual'] },
  seats: Number,
  luggageCapacity: Number,
  bodyType: String,
  exteriorColor: String,
  interiorColor: String,
  features: [{
    type: String,
    enum: ['GPS', 'AC', 'Bluetooth', 'USB', 'WiFi', 'Backup Camera', 'Sunroof', 'Leather Seats', 'Heated Seats', 'Cruise Control', 'Keyless Entry', 'Push Start', 'Apple CarPlay', 'Android Auto', 'Premium Sound', 'Parking Sensors']
  }],

  availability: {
    type: String,
    enum: ['available', 'rented', 'maintenance'],
    default: 'available',
  },
  imageUrls: [{
    type: String,
    trim: true,
  }],
  location: {
    type: String,
    required: true,
    trim: true,
  },
  // Geolocation for map display
  geolocation: {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  // Review statistics (updated when reviews are added/updated)
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
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

// Update the updatedAt field before saving
carSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Car', carSchema);

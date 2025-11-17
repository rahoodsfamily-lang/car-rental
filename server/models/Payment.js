const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['gcash', 'paymaya', 'cash'],
    required: true  // Make it required instead of having a default
  },
  paymentProof: {
    type: String, // URL or path to uploaded screenshot
    default: null
  },
  referenceNumber: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  // Refund tracking fields
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processed'],
    default: 'none'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundMethod: {
    type: String,
    enum: ['gcash', 'paymaya', 'cash', null],
    default: null
  },
  refundDate: {
    type: Date,
    default: null
  },
  refundProcessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  refundNotes: {
    type: String,
    default: null
  },
  refundRequestedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ refundStatus: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

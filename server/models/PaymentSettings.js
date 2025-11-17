const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
  // Only one document should exist
  _id: {
    type: String,
    default: 'payment_settings'
  },
  gcashQRCode: {
    type: String, // URL or path to GCash QR code image
    default: ''
  },
  gcashName: {
    type: String,
    default: ''
  },
  gcashNumber: {
    type: String,
    default: ''
  },
  paymayaQRCode: {
    type: String, // URL or path to PayMaya QR code image
    default: ''
  },
  paymayaName: {
    type: String,
    default: ''
  },
  paymayaNumber: {
    type: String,
    default: ''
  },
  paymentInstructions: {
    type: String,
    default: 'Please scan the QR code and upload your payment screenshot for verification.'
  },
  enabledMethods: {
    gcash: { type: Boolean, default: false }, // Disabled until admin configures QR code and account details
    paymaya: { type: Boolean, default: false },
    cash: { type: Boolean, default: true } // Cash is always available by default
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);

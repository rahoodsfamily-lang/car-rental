const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
  },
  deactivated: {
    type: Boolean,
    default: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    default: null,
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  verification: {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'approved', 'rejected'],
      default: 'unverified',
    },
    driverLicense: {
      number: String,
      frontImage: String,
      backImage: String,
      expiryDate: Date,
      issuedDate: Date,
      issuingState: String,
      category: String, // License type/category (e.g., Class C, Class B)
    },
    // Government ID verification removed - not used in this system
    // governmentId: {
    //   idType: String, // Type of ID (passport, national ID, etc.)
    //   number: String,
    //   frontImage: String,
    //   backImage: String,
    //   expiryDate: Date,
    // },
    selfie: String, // Selfie with license for verification
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: String,
    notes: String,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next(); // ✅ CRITICAL FIX: Return early to prevent password re-hashing
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

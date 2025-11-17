const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  type: {
    type: String,
    enum: ['routine', 'repair', 'inspection', 'oil_change', 'tire_change', 'brake_service', 'engine_repair', 'transmission', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date
  },
  estimatedCost: {
    type: Number,
    default: 0,
    min: 0
  },
  actualCost: {
    type: Number,
    default: 0,
    min: 0
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  partsUsed: [{
    partName: {
      type: String,
      required: true,
      trim: true
    },
    partNumber: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  laborHours: {
    type: Number,
    default: 0,
    min: 0
  },
  laborRate: {
    type: Number,
    default: 0,
    min: 0
  },
  nextMaintenanceDate: {
    type: Date
  },
  mileage: {
    type: Number,
    min: 0
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
maintenanceRecordSchema.index({ car: 1, status: 1 });
maintenanceRecordSchema.index({ status: 1, priority: 1 });
maintenanceRecordSchema.index({ scheduledDate: 1 });
maintenanceRecordSchema.index({ assignedTo: 1, status: 1 });
maintenanceRecordSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
maintenanceRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for total cost (parts + labor)
maintenanceRecordSchema.virtual('totalCost').get(function() {
  const partsCost = this.partsUsed.reduce((sum, part) => sum + (part.cost * part.quantity), 0);
  const laborCost = this.laborHours * this.laborRate;
  return partsCost + laborCost + (this.actualCost || 0);
});

// Virtual for days since scheduled
maintenanceRecordSchema.virtual('daysSinceScheduled').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.scheduledDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
maintenanceRecordSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.scheduledDate;
});

// Static method to find overdue maintenance
maintenanceRecordSchema.statics.findOverdue = function() {
  return this.find({
    status: { $in: ['scheduled', 'in_progress'] },
    scheduledDate: { $lt: new Date() }
  });
};

// Static method to find upcoming maintenance
maintenanceRecordSchema.statics.findUpcoming = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'scheduled',
    scheduledDate: { 
      $gte: new Date(),
      $lte: futureDate
    }
  });
};

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);

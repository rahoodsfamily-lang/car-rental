const MaintenanceRecord = require('../models/MaintenanceRecord');
const Car = require('../models/Car');
const User = require('../models/User');
const { sendNotification } = require('./notificationController');
const { emitToAll } = require('../socket/socketServer');

// Create maintenance record
exports.createMaintenanceRecord = async (req, res) => {
  try {
    const {
      car,
      type,
      description,
      scheduledDate,
      priority,
      estimatedCost,
      assignedTo
    } = req.body;

    // Validate required fields
    if (!car || car.trim() === '') {
      return res.status(400).json({ message: 'Car ID is required' });
    }
    if (!type || type.trim() === '') {
      return res.status(400).json({ message: 'Maintenance type is required' });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!scheduledDate) {
      return res.status(400).json({ message: 'Scheduled date is required' });
    }

    // Build maintenance record object, excluding empty assignedTo
    const maintenanceData = {
      car,
      type,
      description,
      scheduledDate: new Date(scheduledDate),
      priority: priority || 'medium',
      estimatedCost: estimatedCost || 0,
      status: 'scheduled',
      createdBy: req.user._id
    };

    // Only add assignedTo if it's not empty
    if (assignedTo && assignedTo.trim() !== '') {
      maintenanceData.assignedTo = assignedTo;
    }

    const maintenanceRecord = new MaintenanceRecord(maintenanceData);

    await maintenanceRecord.save();
// AUTOMATIC CAR AVAILABILITY MANAGEMENT (timezone safe)
const scheduledDateOnly = new Date(scheduledDate).toISOString().split("T")[0];
const todayOnly = new Date().toISOString().split("T")[0];

if (scheduledDateOnly <= todayOnly) {
  // Set car to maintenance
  await Car.findByIdAndUpdate(car, { availability: "maintenance" });

  try {
    emitToAll("carStatusUpdated", {
      carId: car,
      availability: "maintenance",
      updatedAt: new Date()
    });
  } catch (socketError) {
    console.error("Error broadcasting car status update:", socketError);
  }
}


    // Populate for response
    await maintenanceRecord.populate('car', 'make model year licensePlate');
    await maintenanceRecord.populate('assignedTo', 'profile.firstName profile.lastName email');

    // Send notification to assigned technician
    if (assignedTo) {
      try {
        await sendNotification(
          assignedTo,
          'maintenance_assigned',
          'New Maintenance Task Assigned',
          `You have been assigned a ${priority} priority maintenance task for ${maintenanceRecord.car.make} ${maintenanceRecord.car.model}`,
          { maintenanceId: maintenanceRecord._id, priority }
        );
      } catch (notificationError) {
        console.error('Error sending maintenance notification:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Maintenance record created successfully',
      data: maintenanceRecord
    });
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors 
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      message: 'Error creating maintenance record', 
      error: error.message 
    });
  }
};

// Get all maintenance records
exports.getAllMaintenanceRecords = async (req, res) => {
  try {
    const { status, priority, type, carId, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (carId) filter.car = carId;

    const skip = (page - 1) * limit;

    const records = await MaintenanceRecord.find(filter)
      .populate('car', 'make model year licensePlate imageUrls')
      .populate('assignedTo', 'profile.firstName profile.lastName email')
      .populate('createdBy', 'profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MaintenanceRecord.countDocuments(filter);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maintenance records', error: error.message });
  }
};

// Update maintenance record
exports.updateMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      actualCost,
      completedDate,
      notes,
      partsUsed,
      nextMaintenanceDate
    } = req.body;

    const record = await MaintenanceRecord.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    // Update fields
    if (status) record.status = status;
    if (actualCost !== undefined) record.actualCost = actualCost;
    if (completedDate) record.completedDate = new Date(completedDate);
    if (notes) record.notes = notes;
    if (partsUsed) record.partsUsed = partsUsed;
    if (nextMaintenanceDate) record.nextMaintenanceDate = new Date(nextMaintenanceDate);

    record.updatedBy = req.user.id;
    record.updatedAt = new Date();

    await record.save();

    // AUTOMATIC CAR AVAILABILITY MANAGEMENT
    let carStatusMessage = '';
    if (status === 'in_progress') {
      // Automatically set car to maintenance when work starts
      await Car.findByIdAndUpdate(record.car, { 
        availability: 'maintenance'
      });
      carStatusMessage = 'Car automatically set to MAINTENANCE status';
      
      // Broadcast car status change via WebSocket
      try {
        emitToAll('carStatusUpdated', {
          carId: record.car,
          availability: 'maintenance',
          updatedAt: new Date()
        });
      } catch (socketError) {
        console.error('Error broadcasting car status update:', socketError);
      }
    } else if (status === 'completed' || status === 'cancelled') {
      // Automatically set car back to available when maintenance is done or cancelled
      await Car.findByIdAndUpdate(record.car, { 
        availability: 'available',
        lastMaintenanceDate: record.completedDate || new Date(),
        nextMaintenanceDate: record.nextMaintenanceDate
      });
      carStatusMessage = status === 'completed' 
        ? 'Car automatically set to AVAILABLE - Ready for rentals!' 
        : 'Car automatically set to AVAILABLE (maintenance cancelled)';
      
      // Broadcast car status change via WebSocket
      try {
        emitToAll('carStatusUpdated', {
          carId: record.car,
          availability: 'available',
          updatedAt: new Date()
        });
      } catch (socketError) {
        console.error('Error broadcasting car status update:', socketError);
      }
    }

    // Populate for response
    await record.populate('car', 'make model year licensePlate');
    await record.populate('assignedTo', 'profile.firstName profile.lastName');

    // Send notifications on status change
    if (status) {
      // Notify assigned technician
      if (record.assignedTo) {
        try {
          let message = `Maintenance task status updated to: ${status}`;
          if (status === 'completed') {
            message += `. Total cost: ₱${record.actualCost || record.estimatedCost}`;
          }
          
          await sendNotification(
            record.assignedTo._id,
            'maintenance_updated',
            'Maintenance Task Updated',
            message,
            { maintenanceId: record._id, status }
          );
        } catch (notificationError) {
          console.error('Error sending maintenance update notification:', notificationError);
        }
      }

      // Notify admins when maintenance starts (in_progress)
      if (status === 'in_progress') {
        try {
          const { broadcastToAdmins } = require('./notificationController');
          const carInfo = `${record.car.year} ${record.car.make} ${record.car.model}`;
          const adminMessage = `MAINTENANCE STARTED

Vehicle: ${carInfo}
Type: ${record.type}
Priority: ${record.priority}
Estimated Cost: ₱${record.estimatedCost}

${carStatusMessage}

Work has begun on this vehicle. It is currently unavailable for customer bookings.`;

          await broadcastToAdmins({
            type: 'maintenance_updated',
            message: adminMessage,
            subject: `Maintenance Started - ${carInfo}`,
            priority: record.priority === 'urgent' ? 'high' : 'medium',
            isAdminCopy: true
          });
        } catch (notificationError) {
          console.error('Error sending admin notification:', notificationError);
        }
      }

      // Notify admins when maintenance is completed
      if (status === 'completed') {
        try {
          const { broadcastToAdmins } = require('./notificationController');
          const carInfo = `${record.car.year} ${record.car.make} ${record.car.model}`;
          const adminMessage = `MAINTENANCE COMPLETED

Vehicle: ${carInfo}
Type: ${record.type}
Cost: ₱${record.actualCost || record.estimatedCost}

${carStatusMessage}

The vehicle is now available for customer bookings.`;

          await broadcastToAdmins({
            type: 'maintenance_completed',
            message: adminMessage,
            subject: `Maintenance Completed - ${carInfo}`,
            priority: 'medium',
            isAdminCopy: true
          });
        } catch (notificationError) {
          console.error('Error sending admin notification:', notificationError);
        }
      }
    }

    res.json({
      success: true,
      message: 'Maintenance record updated successfully',
      data: record
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating maintenance record', error: error.message });
  }
};

// Get maintenance record by ID
exports.getMaintenanceRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await MaintenanceRecord.findById(id)
      .populate('car', 'make model year licensePlate imageUrls pricePerDay')
      .populate('assignedTo', 'profile.firstName profile.lastName email')
      .populate('createdBy', 'profile.firstName profile.lastName')
      .populate('updatedBy', 'profile.firstName profile.lastName');

    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maintenance record', error: error.message });
  }
};

// Get maintenance statistics
exports.getMaintenanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get status distribution
    const statusStats = await MaintenanceRecord.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get priority distribution
    const priorityStats = await MaintenanceRecord.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          priority: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get cost analysis - use actualCost if available, otherwise use estimatedCost
    const costStats = await MaintenanceRecord.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $addFields: {
          effectiveCost: {
            $cond: {
              if: { $gt: ['$actualCost', 0] },
              then: '$actualCost',
              else: '$estimatedCost'
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$effectiveCost' },
          averageCost: { $avg: '$effectiveCost' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get cars needing maintenance
    const carsNeedingMaintenance = await Car.find({
      $or: [
        { nextMaintenanceDate: { $lte: new Date() } },
        { availability: 'maintenance' }
      ]
    }).select('make model year licensePlate nextMaintenanceDate availability');

    // Get overdue maintenance
    const overdueMaintenance = await MaintenanceRecord.find({
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledDate: { $lt: new Date() }
    })
      .populate('car', 'make model year licensePlate')
      .select('car scheduledDate priority type description');

    res.json({
      success: true,
      data: {
        statusDistribution: statusStats,
        priorityDistribution: priorityStats,
        costAnalysis: costStats[0] || { totalCost: 0, averageCost: 0, count: 0 },
        carsNeedingMaintenance,
        overdueMaintenance,
        summary: {
          totalRecords: await MaintenanceRecord.countDocuments(dateFilter),
          completedThisMonth: await MaintenanceRecord.countDocuments({
            status: 'completed',
            completedDate: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }),
          pendingMaintenance: await MaintenanceRecord.countDocuments({
            status: { $in: ['scheduled', 'in_progress'] }
          }),
          activeUrgentCount: await MaintenanceRecord.countDocuments({
            priority: { $in: ['urgent', 'high'] },
            status: { $nin: ['completed', 'cancelled'] }
          })
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maintenance statistics', error: error.message });
  }
};

// Schedule routine maintenance for all cars
exports.scheduleRoutineMaintenance = async (req, res) => {
  try {
    const { maintenanceType, daysFromNow } = req.body;

    const cars = await Car.find({ availability: { $ne: 'maintenance' } });
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + (daysFromNow || 30));

    const maintenanceRecords = [];

    for (const car of cars) {
      const record = new MaintenanceRecord({
        car: car._id,
        type: maintenanceType || 'routine',
        description: `Scheduled ${maintenanceType || 'routine'} maintenance`,
        scheduledDate,
        priority: 'medium',
        status: 'scheduled',
        createdBy: req.user.id
      });

      await record.save();
      maintenanceRecords.push(record);
    }

    res.json({
      success: true,
      message: `Scheduled ${maintenanceType || 'routine'} maintenance for ${cars.length} cars`,
      data: {
        scheduledCount: cars.length,
        scheduledDate,
        maintenanceType: maintenanceType || 'routine'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error scheduling routine maintenance', error: error.message });
  }
};

// Get maintenance history for a specific car (public route)
exports.getCarMaintenanceHistory = async (req, res) => {
  try {
    const { id: carId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    const skip = (page - 1) * limit;

    // Fetch maintenance records for the specific car
    const records = await MaintenanceRecord.find({ car: carId })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name')
      .sort({ scheduledDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await MaintenanceRecord.countDocuments({ car: carId });

    res.json({
      success: true,
      maintenanceRecords: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching car maintenance history', 
      error: error.message 
    });
  }
};

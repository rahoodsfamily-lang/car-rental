const MaintenanceRecord = require('../models/MaintenanceRecord');
const Car = require('../models/Car');
const { broadcastToAdmins } = require('../controllers/notificationController');
const { emitToAll } = require('../socket/socketServer');

/**
 * Automatic Maintenance Scheduler
 * 
 * This utility automatically manages car availability based on scheduled maintenance dates.
 * Runs daily to check if any scheduled maintenance should start today.
 */

const checkScheduledMaintenance = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find maintenance records scheduled for today that are still in 'scheduled' status
    const maintenanceToday = await MaintenanceRecord.find({
      status: 'scheduled',
      scheduledDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('car', 'make model year licensePlate availability');
    
    if (maintenanceToday.length === 0) {
      return;
    }
    
    let updatedCount = 0;
    const updatedCars = [];
    
    for (const maintenance of maintenanceToday) {
      try {
        // Only update if car is not already in maintenance
        if (maintenance.car.availability !== 'maintenance') {
          await Car.findByIdAndUpdate(maintenance.car._id, {
            availability: 'maintenance'
          });
          
          updatedCount++;
          updatedCars.push({
            id: maintenance.car._id,
            info: `${maintenance.car.year} ${maintenance.car.make} ${maintenance.car.model}`,
            type: maintenance.type
          });
          
          // Broadcast car status change via WebSocket
          try {
            emitToAll('carStatusUpdated', {
              carId: maintenance.car._id,
              availability: 'maintenance',
              updatedAt: new Date()
            });
          } catch (socketError) {
            console.error('Error broadcasting car status update:', socketError);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating car ${maintenance.car._id}:`, error);
      }
    }
    
    // Send notification to admins if any cars were updated
    if (updatedCount > 0) {
      try {
        const carList = updatedCars.map(car => 
          `• ${car.info} - ${car.type}`
        ).join('\n');
        
        const adminMessage = `SCHEDULED MAINTENANCE STARTED

${updatedCount} vehicle(s) have been automatically set to maintenance status:

${carList}

These vehicles are now unavailable for customer bookings.

Action Required:
• Review maintenance tasks in the Maintenance Manager
• Update status to 'in_progress' when work begins
• Mark as 'completed' when maintenance is finished
• Vehicle availability will automatically update when completed

Note: This is an automated notification from the maintenance scheduler.`;

        await broadcastToAdmins({
          type: 'maintenance_alert',
          message: adminMessage,
          subject: `Scheduled Maintenance Started - ${updatedCount} Vehicle(s)`,
          priority: 'high',
          isAdminCopy: true
        });
      } catch (notificationError) {
        console.error('❌ Error sending admin notification:', notificationError);
      }
    }
  } catch (error) {
    console.error('❌ Error in maintenance scheduler:', error);
  }
};

module.exports = { checkScheduledMaintenance };

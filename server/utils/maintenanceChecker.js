const Car = require('../models/Car');
const { broadcastToAdmins, sendEmailToAdmins } = require('../controllers/notificationController');

// Check for cars that need maintenance and notify admins only
const checkMaintenanceAlerts = async () => {
  try {
    console.log('Checking for maintenance alerts...');
    
    // Find cars with availability set to 'maintenance'
    const maintenanceCars = await Car.find({ availability: 'maintenance' });
    
    if (maintenanceCars.length === 0) {
      console.log('No cars currently in maintenance.');
      return;
    }
    
    // Build a summary message for admins
    const maintenanceList = maintenanceCars.map(car => 
      `• ${car.year || ''} ${car.make} ${car.model}`
    ).join('\n');
    
    const adminMessage = `MAINTENANCE ALERT: ${maintenanceCars.length} vehicle(s) currently in maintenance status.

Vehicles in Maintenance:
${maintenanceList}

Action Required:
• Review maintenance schedule
• Update vehicle availability when maintenance is complete
• Reassign any affected upcoming bookings
• Contact customers if their bookings are affected

Please check the admin dashboard for more details.`;
    
    const adminSubject = `Maintenance Alert - ${maintenanceCars.length} Vehicle(s) in Maintenance`;
    
    // Send notification to all admins
    await broadcastToAdmins({
      type: 'maintenance_alert',
      message: adminMessage,
      subject: adminSubject,
      priority: 'high',
      isAdminCopy: true
    });
    
    // Send email to all admins
    await sendEmailToAdmins(adminSubject, adminMessage);
    
    console.log(`Maintenance alert sent to admins for ${maintenanceCars.length} vehicle(s).`);
  } catch (error) {
    console.error('Error checking maintenance alerts:', error);
  }
};

module.exports = { checkMaintenanceAlerts };

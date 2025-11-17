const cron = require('node-cron');
const { checkOverdueRentals } = require('./overdueChecker');
const { checkMaintenanceAlerts } = require('./maintenanceChecker');
const { checkBookingReminders } = require('./bookingReminderChecker');
const { checkScheduledMaintenance } = require('./maintenanceScheduler');

// Schedule overdue rental check to run every 30 minutes
const scheduleOverdueCheck = () => {
  console.log('Scheduling overdue rental checks to run every 30 minutes...');
  cron.schedule('*/30 * * * *', async () => {
    console.log('Running scheduled overdue rental check at:', new Date().toISOString());
    try {
      await checkOverdueRentals();
    } catch (error) {
      console.error('Error in scheduled overdue check:', error);
    }
  });
};

// Schedule maintenance alert check to run every day at 1 AM
const scheduleMaintenanceCheck = () => {
  cron.schedule('0 1 * * *', async () => {
    await checkMaintenanceAlerts();
  });
};

// Schedule booking reminder check to run every hour
const scheduleBookingReminderCheck = () => {
  cron.schedule('0 * * * *', async () => {
    await checkBookingReminders();
  });
};

// Schedule maintenance scheduler to run daily at 8 AM (start of operating hours)
const scheduleMaintenanceScheduler = () => {
  console.log('Scheduling maintenance scheduler to run daily at 8:00 AM...');
  cron.schedule('0 8 * * *', async () => {
    console.log('Running scheduled maintenance check at:', new Date().toISOString());
    try {
      await checkScheduledMaintenance();
    } catch (error) {
      console.error('Error in scheduled maintenance check:', error);
    }
  });
};

module.exports = { 
  scheduleOverdueCheck, 
  scheduleMaintenanceCheck, 
  scheduleBookingReminderCheck,
  scheduleMaintenanceScheduler 
};

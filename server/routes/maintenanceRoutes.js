const express = require('express');
const router = express.Router();
const {
  createMaintenanceRecord,
  getAllMaintenanceRecords,
  updateMaintenanceRecord,
  getMaintenanceRecordById,
  getMaintenanceStats,
  scheduleRoutineMaintenance
} = require('../controllers/maintenanceController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

// All maintenance routes require admin access
router.use(authenticate, authorizeAdmin);

// Maintenance records CRUD
router.route('/')
  .get(getAllMaintenanceRecords)
  .post(createMaintenanceRecord);

router.route('/stats')
  .get(getMaintenanceStats);

router.route('/schedule-routine')
  .post(scheduleRoutineMaintenance);

router.route('/:id')
  .get(getMaintenanceRecordById)
  .patch(updateMaintenanceRecord);

module.exports = router;

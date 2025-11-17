const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize cron scheduler
const { scheduleOverdueCheck, scheduleMaintenanceCheck, scheduleBookingReminderCheck, scheduleMaintenanceScheduler } = require('./utils/cron');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://localhost:27017/car-rental', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/cars', require('./routes/carRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/rentals', require('./routes/rentalRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/notification-settings', require('./routes/notificationSettingsRoutes'));

app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
// app.use('/api/uploads', require('./routes/uploadRoutes')); // Disabled - using Cloudinary now
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/favorites', require('./routes/favoriteRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/refunds', require('./routes/refundRoutes'));
app.use('/api/geocoding', require('./routes/geocodingRoutes'));


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const http = require('http');
const server = http.createServer(app);

// Initialize Socket.io
const { initializeSocket } = require('./socket/socketServer');
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize cron jobs
  scheduleOverdueCheck();
  scheduleMaintenanceCheck();
  scheduleBookingReminderCheck();
  scheduleMaintenanceScheduler();
  console.log('Cron jobs initialized (overdue check, maintenance alerts, booking reminders, maintenance scheduler)');
});

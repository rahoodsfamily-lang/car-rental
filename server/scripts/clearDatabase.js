
/**
 * Clear Database Script
 * WARNING: This will delete ALL data from the database!
 * Use with caution - only for development/testing purposes.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import all models
const User = require('../models/User');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');
const PaymentSettings = require('../models/PaymentSettings');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const Favorite = require('../models/Favorite');
const Review = require('../models/Review');

const clearDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('⚠️  WARNING: This will delete ALL data from the database!');
    console.log('⚠️  This action cannot be undone!\n');

    // Wait 3 seconds to allow user to cancel
    console.log('⏳ Starting in 3 seconds... Press Ctrl+C to cancel');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🗑️  Deleting all data...\n');

    // Delete all collections
    const collections = [
      { name: 'Users', model: User },
      { name: 'Cars', model: Car },
      { name: 'Bookings', model: Booking },
      { name: 'Rentals', model: Rental },
      { name: 'Payments', model: Payment },
      { name: 'Notifications', model: Notification },
      { name: 'NotificationSettings', model: NotificationSettings },
      { name: 'PaymentSettings', model: PaymentSettings },
      { name: 'MaintenanceRecords', model: MaintenanceRecord },
      { name: 'Favorites', model: Favorite },
      { name: 'Reviews', model: Review }
    ];

    for (const collection of collections) {
      try {
        const result = await collection.model.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} documents from ${collection.name}`);
      } catch (error) {
        console.log(`⚠️  ${collection.name}: ${error.message}`);
      }
    }

    console.log('\n✅ Database cleared successfully!');
    console.log('💡 You can now start fresh with clean data.\n');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
clearDatabase();

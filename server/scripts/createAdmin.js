const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminAccount = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://localhost:27017/car-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@carrentalsystem.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log(`⚠️  Admin account already exists with email: ${adminEmail}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Email Verified: ${existingAdmin.emailVerified}`);
      console.log(`   Deactivated: ${existingAdmin.deactivated}`);
      
      // Update existing admin to ensure it's properly configured
      existingAdmin.role = 'admin';
      existingAdmin.emailVerified = true;
      existingAdmin.deactivated = false;
      
      // Only update password if it's provided and different
      if (adminPassword) {
        existingAdmin.password = adminPassword;
      }
      
      await existingAdmin.save();
      console.log('✅ Admin account updated successfully!');
    } else {
      // Create new admin account
      const admin = new User({
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        emailVerified: true, // ✅ CRITICAL: Must be true to allow login
        deactivated: false,
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          phone: '0000000000'
        }
      });

      await admin.save();
      console.log('✅ Admin account created successfully!');
    }

    console.log('\n📋 Admin Account Details:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: admin`);
    console.log(`   Email Verified: true`);
    console.log(`   Deactivated: false`);
    console.log('\n✅ You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  }
};

createAdminAccount();

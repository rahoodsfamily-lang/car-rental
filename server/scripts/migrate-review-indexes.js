const mongoose = require('mongoose');
require('dotenv').config();

const migrateReviewIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('reviews');

    // Drop the old index (userId_1_carId_1)
    try {
      await collection.dropIndex('userId_1_carId_1');
      console.log('✅ Dropped old index: userId_1_carId_1');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  Old index userId_1_carId_1 does not exist (already dropped)');
      } else {
        console.log('⚠️  Error dropping old index:', error.message);
      }
    }

    // Create the new index (userId_1_rentalId_1)
    try {
      await collection.createIndex(
        { userId: 1, rentalId: 1 }, 
        { unique: true, name: 'userId_1_rentalId_1' }
      );
      console.log('✅ Created new index: userId_1_rentalId_1');
    } catch (error) {
      console.log('⚠️  Error creating new index:', error.message);
    }

    // List all indexes to verify
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration
migrateReviewIndexes();

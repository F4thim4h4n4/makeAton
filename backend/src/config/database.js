import mongoose from 'mongoose';
import appConfig from './config.js';
import { seedDatabase } from '../utils/seed.js';

let mongoMemoryServerInstance = null;

/**
 * Establish a connection to MongoDB.
 * 1. Attempts connection to configured MONGODB_URI.
 * 2. If local MongoDB is not running, falls back to in-memory MongoDB
 *    so development, testing, and demoing succeed smoothly.
 */
const connectDB = async () => {
  const { mongoUri } = appConfig;

  try {
    // Attempt connecting to the configured URI with a 2-second timeout
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[DB] ✅ MongoDB connected to external instance → ${conn.connection.host}:${conn.connection.port}`);
    return conn;
  } catch (initialError) {
    console.warn(`[DB] ⚠️ Could not connect to '${mongoUri}': ${initialError.message}`);
    console.log('[DB] 🔄 Falling back to embedded MongoMemoryServer for development / testing...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServerInstance = await MongoMemoryServer.create();
      const inMemoryUri = mongoMemoryServerInstance.getUri();

      const conn = await mongoose.connect(inMemoryUri);
      console.log(`[DB] ✅ In-memory MongoDB connected successfully → ${inMemoryUri}`);

      // Auto-seed for instant demo availability if empty
      const User = (await import('../models/User.js')).default;
      const count = await User.countDocuments();
      if (count === 0) {
        console.log('[DB] 📦 Fresh instance detected. Auto-seeding Brightloop demo records...');
        await seedDatabase();
      }

      return conn;
    } catch (fallbackError) {
      console.error('[DB] ❌ All MongoDB connection methods failed:', fallbackError.message);
      process.exit(1);
    }
  }
};

export default connectDB;

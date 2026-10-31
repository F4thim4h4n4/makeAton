import mongoose from 'mongoose';
import appConfig from './config.js';

/**
 * Establish a connection to MongoDB.
 * Throws an error (and exits the process) if MONGODB_URI is missing or the
 * connection fails, so the problem is immediately visible rather than silent.
 */
const connectDB = async () => {
  const { mongoUri } = appConfig;

  if (!mongoUri) {
    console.error(
      '[DB] ❌  MONGODB_URI is not set. ' +
        'Copy backend/.env.example to backend/.env and fill in the connection string.'
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[DB] ✅  MongoDB connected → ${conn.connection.host}`);
  } catch (error) {
    console.error('[DB] ❌  MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;

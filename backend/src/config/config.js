import { config } from 'dotenv';
config();

/**
 * Central configuration object loaded from environment variables.
 * Import this module anywhere in the backend to access settings.
 */
const appConfig = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // jwt: {
  //   secret: process.env.JWT_SECRET,
  //   expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // },
};

export default appConfig;

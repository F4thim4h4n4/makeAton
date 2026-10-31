import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from backend/.env or root .env
config({ path: path.resolve(__dirname, '../../.env') });
config();

/**
 * Central configuration object loaded from environment variables.
 * Import this module anywhere in the backend to access settings.
 */
const appConfig = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/subscription_db',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'brightloop-hackathon-secret-key-makeaton-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};

export default appConfig;

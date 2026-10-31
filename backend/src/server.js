import app from './app.js';
import connectDB from './config/database.js';
import appConfig from './config/config.js';

const { port } = appConfig;

const startServer = async () => {
  // Start the HTTP listener first so /api/health is immediately reachable
  app.listen(port, () => {
    console.log(`[SERVER] 🚀  Backend running on http://localhost:${port}`);
    console.log(`[SERVER] 🔍  Health check → http://localhost:${port}/api/health`);
    console.log(`[SERVER] 🌍  Environment  → ${appConfig.nodeEnv}`);
  });

  // Connect to MongoDB after the server is up.
  // connectDB will log a clear error and call process.exit(1) if it fails.
  await connectDB();
};

startServer();

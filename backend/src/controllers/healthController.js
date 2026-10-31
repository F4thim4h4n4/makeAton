/**
 * Health-check controller
 * GET /api/health
 *
 * Returns the current server status, uptime, and timestamp.
 * Does NOT check the database connection here – that is handled at startup.
 */
export const healthCheck = (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Subscription Management System API is running',
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
};

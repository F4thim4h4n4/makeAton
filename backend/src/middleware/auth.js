// Simple stub auth middleware for admin role
// Later replaced by full JWT auth from Member 2
export const authorizeAdmin = (req, res, next) => {
  // Expect a user object populated by auth layer
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  // For now, allow all for development if no user (to avoid blocking)
  // You can set an env var to enforce strictness
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Forbidden: admin access required' });
  }
  return next();
};

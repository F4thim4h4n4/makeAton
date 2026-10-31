import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import appConfig from '../config/config.js';

const JWT_SECRET = process.env.JWT_SECRET || 'brightloop-makeaton-jwt-secret-2026';

/**
 * Protect routes: Authenticate JWT token
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, no token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
};

/**
 * Authorize specified roles (e.g. 'admin', 'staff')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

/**
 * Restrict customer access to their own customer ID
 */
export const enforceCustomerIsolation = (customerIdParamName = 'customerId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Admins and Staff can access any customer's records
    if (['admin', 'staff'].includes(req.user.role)) {
      return next();
    }

    // If role is customer, ensure customer ID matches req.user.customer
    const targetCustomerId =
      req.params[customerIdParamName] ||
      req.params.id ||
      req.query.customer ||
      req.body.customer;

    if (!req.user.customer) {
      return res.status(403).json({
        success: false,
        message: 'Customer account not linked to customer profile',
      });
    }

    if (
      targetCustomerId &&
      targetCustomerId.toString() !== req.user.customer.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own customer records',
      });
    }

    next();
  };
};

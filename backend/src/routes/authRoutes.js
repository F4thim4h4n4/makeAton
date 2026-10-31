import express from 'express';
import {
  register,
  login,
  getMe,
  createStaff,
  forgotPassword,
  resetPassword,
  logout,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/staff', protect, authorize('admin'), createStaff);

export default router;

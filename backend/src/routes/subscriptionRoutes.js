import express from 'express';
import {
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscriptionStatus,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  renewSubscription,
} from '../controllers/subscriptionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSubscriptions)
  .post(authorize('admin', 'staff'), createSubscription);

router.route('/:id')
  .get(getSubscriptionById);

router.patch('/:id/status', authorize('admin', 'staff'), updateSubscriptionStatus);
router.patch('/:id/pause', authorize('admin', 'staff'), pauseSubscription);
router.patch('/:id/resume', authorize('admin', 'staff'), resumeSubscription);
router.patch('/:id/cancel', cancelSubscription);
router.patch('/:id/renew', authorize('admin', 'staff'), renewSubscription);

export default router;

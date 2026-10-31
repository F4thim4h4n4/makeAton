import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All customer routes require authentication
router.use(protect);

router.route('/')
  .get(getCustomers)
  .post(authorize('admin', 'staff'), createCustomer);

router.route('/:id')
  .get(getCustomerById)
  .put(updateCustomer)
  .delete(authorize('admin'), deleteCustomer);

export default router;

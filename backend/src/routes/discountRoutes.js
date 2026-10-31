import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getDiscounts,
  createDiscount,
  getDiscountById,
  updateDiscount,
  deactivateDiscount,
} from '../controllers/discountController.js';
import { validateRequest } from '../validators/validationMiddleware.js';
import { authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/discounts
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('type').optional().isIn(['percentage', 'fixed']),
    query('scope').optional().isIn(['product', 'subscription']),
    query('status').optional().isIn(['active', 'inactive']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  getDiscounts
);

// POST /api/discounts
router.post(
  '/',
  authorizeAdmin,
  [
    body('name').exists().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('type').exists().isIn(['percentage', 'fixed']),
    body('value').exists().isFloat({ min: 0 }).toFloat(),
    body('minPurchaseAmount').optional().isFloat({ min: 0 }).toFloat(),
    body('minQuantity').optional().isInt({ min: 0 }).toInt(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('maxUsageCount').optional().isInt({ min: 0 }).toInt(),
    body('applicableProducts').optional().isArray(),
    body('applicableProducts.*').optional().isMongoId(),
    body('scope').optional().isIn(['product', 'subscription']),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  createDiscount
);

// GET /api/discounts/:id
router.get('/:id', [param('id').isMongoId()], validateRequest, getDiscountById);

// PATCH /api/discounts/:id
router.patch(
  '/:id',
  authorizeAdmin,
  [
    param('id').isMongoId(),
    body('name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('type').optional().isIn(['percentage', 'fixed']),
    body('value').optional().isFloat({ min: 0 }).toFloat(),
    body('minPurchaseAmount').optional().isFloat({ min: 0 }).toFloat(),
    body('minQuantity').optional().isInt({ min: 0 }).toInt(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('maxUsageCount').optional().isInt({ min: 0 }).toInt(),
    body('applicableProducts').optional().isArray(),
    body('applicableProducts.*').optional().isMongoId(),
    body('scope').optional().isIn(['product', 'subscription']),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  updateDiscount
);

// POST /api/discounts/:id/deactivate
router.post(
  '/:id/deactivate',
  authorizeAdmin,
  [param('id').isMongoId()],
  validateRequest,
  deactivateDiscount
);

export default router;

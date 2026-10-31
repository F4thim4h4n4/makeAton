import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getPlans,
  createPlan,
  getPlanById,
  updatePlan,
  deactivatePlan,
  calculatePlanPrice,
} from '../controllers/planController.js';
import { validateRequest } from '../validators/validationMiddleware.js';
import { authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/plans
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('billingInterval').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
    query('status').optional().isIn(['active', 'inactive']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  getPlans
);

// POST /api/plans
router.post(
  '/',
  authorizeAdmin,
  [
    body('name').exists().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('productIds').optional().isArray(),
    body('productIds.*').optional().isMongoId(),
    body('billingInterval').exists().isIn(['daily', 'weekly', 'monthly', 'yearly']),
    body('price').exists().isFloat({ min: 0 }).toFloat(),
    body('minQuantity').optional().isInt({ min: 1 }).toInt(),
    body('availableFrom').optional().isISO8601(),
    body('availableUntil').optional().isISO8601(),
    body('allowEarlyClose').optional().isBoolean(),
    body('allowPause').optional().isBoolean(),
    body('allowRenewal').optional().isBoolean(),
    body('autoCloseOnExpiry').optional().isBoolean(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  createPlan
);

// GET /api/plans/:id
router.get('/:id', [param('id').isMongoId()], validateRequest, getPlanById);

// PATCH /api/plans/:id
router.patch(
  '/:id',
  authorizeAdmin,
  [
    param('id').isMongoId(),
    body('name').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('productIds').optional().isArray(),
    body('productIds.*').optional().isMongoId(),
    body('billingInterval').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
    body('price').optional().isFloat({ min: 0 }).toFloat(),
    body('minQuantity').optional().isInt({ min: 1 }).toInt(),
    body('availableFrom').optional().isISO8601(),
    body('availableUntil').optional().isISO8601(),
    body('allowEarlyClose').optional().isBoolean(),
    body('allowPause').optional().isBoolean(),
    body('allowRenewal').optional().isBoolean(),
    body('autoCloseOnExpiry').optional().isBoolean(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  updatePlan
);

// POST /api/plans/:id/deactivate
router.post(
  '/:id/deactivate',
  authorizeAdmin,
  [param('id').isMongoId()],
  validateRequest,
  deactivatePlan
);

// POST /api/plans/:id/calculate
router.post(
  '/:id/calculate',
  [
    param('id').isMongoId(),
    body('quantity').optional().isInt({ min: 1 }).toInt(),
  ],
  validateRequest,
  calculatePlanPrice
);

export default router;

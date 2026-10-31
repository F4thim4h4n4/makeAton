import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getTaxes,
  createTax,
  getTaxById,
  updateTax,
  deactivateTax,
  calculateTaxPreview,
} from '../controllers/taxController.js';
import { validateRequest } from '../validators/validationMiddleware.js';
import { authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/taxes
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('type').optional().isIn(['percentage', 'fixed']),
    query('status').optional().isIn(['active', 'inactive']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  getTaxes
);

// POST /api/taxes
router.post(
  '/',
  authorizeAdmin,
  [
    body('name').exists().isString().trim().notEmpty(),
    body('type').exists().isIn(['percentage', 'fixed']),
    body('rate').exists().isFloat({ min: 0 }).toFloat(),
    body('applicableProducts').optional().isArray(),
    body('applicableProducts.*').optional().isMongoId(),
    body('effectiveFrom').optional().isISO8601(),
    body('effectiveTo').optional().isISO8601(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  createTax
);

// POST /api/taxes/calculate
router.post(
  '/calculate',
  [
    body('amount').exists().isFloat({ min: 0 }).toFloat(),
    body('productId').optional().isMongoId(),
    body('date').optional().isISO8601(),
  ],
  validateRequest,
  calculateTaxPreview
);

// GET /api/taxes/:id
router.get('/:id', [param('id').isMongoId()], validateRequest, getTaxById);

// PATCH /api/taxes/:id
router.patch(
  '/:id',
  authorizeAdmin,
  [
    param('id').isMongoId(),
    body('name').optional().isString().trim().notEmpty(),
    body('type').optional().isIn(['percentage', 'fixed']),
    body('rate').optional().isFloat({ min: 0 }).toFloat(),
    body('applicableProducts').optional().isArray(),
    body('applicableProducts.*').optional().isMongoId(),
    body('effectiveFrom').optional().isISO8601(),
    body('effectiveTo').optional().isISO8601(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  updateTax
);

// POST /api/taxes/:id/deactivate
router.post(
  '/:id/deactivate',
  authorizeAdmin,
  [param('id').isMongoId()],
  validateRequest,
  deactivateTax
);

export default router;

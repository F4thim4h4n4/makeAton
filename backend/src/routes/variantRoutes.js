import express from 'express';
import { body, param } from 'express-validator';
import { getVariants, createVariant, updateVariant } from '../controllers/variantController.js';
import { validateRequest } from '../validators/validationMiddleware.js';
import { authorizeAdmin } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true }); // mergeParams for :id from parent

// GET /api/products/:id/variants
router.get('/', [param('id').isMongoId()], validateRequest, getVariants);

// POST /api/products/:id/variants
router.post(
  '/',
  authorizeAdmin,
  [
    param('id').isMongoId(),
    body('name').exists().isString().trim().notEmpty(),
    body('additionalPrice').exists().isFloat({ min: 0 }).toFloat(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  createVariant
);

// PATCH /api/products/:id/variants/:variantId
router.patch(
  '/:variantId',
  authorizeAdmin,
  [
    param('id').isMongoId(),
    param('variantId').isMongoId(),
    body('name').optional().isString().trim().notEmpty(),
    body('additionalPrice').optional().isFloat({ min: 0 }).toFloat(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  updateVariant
);

export default router;

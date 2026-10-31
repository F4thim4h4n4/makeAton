import express from 'express';
import { body, param, query } from 'express-validator';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deactivateProduct,
} from '../controllers/productController.js';
import { validateRequest } from '../validators/validationMiddleware.js';
import { authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/products?search=&type=&status=&page=&limit=
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('type').optional().isString(),
    query('status').optional().isIn(['active', 'inactive']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  getProducts
);

// POST /api/products
router.post(
  '/',
  authorizeAdmin,
  [
    body('name').exists().isString().trim().notEmpty(),
    body('type').optional().isString(),
    body('salesPrice').exists().isFloat({ min: 0 }).toFloat(),
    body('costPrice').optional().isFloat({ min: 0 }).toFloat(),
    body('notes').optional().isString(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  createProduct
);

// GET /api/products/:id
router.get('/:id', [param('id').isMongoId()], validateRequest, getProductById);

// PATCH /api/products/:id
router.patch(
  '/:id',
  authorizeAdmin,
  [
    param('id').isMongoId(),
    body('name').optional().isString().trim().notEmpty(),
    body('type').optional().isString(),
    body('salesPrice').optional().isFloat({ min: 0 }).toFloat(),
    body('costPrice').optional().isFloat({ min: 0 }).toFloat(),
    body('notes').optional().isString(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  updateProduct
);

// POST /api/products/:id/deactivate
router.post(
  '/:id/deactivate',
  authorizeAdmin,
  [param('id').isMongoId()],
  validateRequest,
  deactivateProduct
);

export default router;

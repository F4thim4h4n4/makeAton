import express from 'express';
import {
  getQuotations,
  getQuotationTemplates,
  getQuotationById,
  createQuotation,
  updateQuotation,
  sendQuotation,
  confirmQuotation,
  convertQuotationToSubscription,
} from '../controllers/quotationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/templates', authorize('admin', 'staff'), getQuotationTemplates);

router.route('/')
  .get(getQuotations)
  .post(authorize('admin', 'staff'), createQuotation);

router.route('/:id')
  .get(getQuotationById)
  .put(authorize('admin', 'staff'), updateQuotation);

router.patch('/:id/send', authorize('admin', 'staff'), sendQuotation);
router.patch('/:id/confirm', confirmQuotation);
router.post('/:id/convert', authorize('admin', 'staff'), convertQuotationToSubscription);

export default router;

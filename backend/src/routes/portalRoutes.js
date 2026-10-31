import express from 'express';
import {
  getPortalProfile,
  getPortalSubscriptions,
  getPortalInvoices,
  getPortalInvoiceDetail,
  getPortalPayments,
} from '../controllers/portalController.js';

const router = express.Router();

router.get('/profile', getPortalProfile);
router.get('/subscriptions', getPortalSubscriptions);
router.get('/invoices', getPortalInvoices);
router.get('/invoices/:id', getPortalInvoiceDetail);
router.get('/payments', getPortalPayments);

export default router;

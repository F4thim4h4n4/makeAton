import express from 'express';
import {
  getRevenueReport,
  getOverdueReport,
  getSubscriptionReport,
  exportRevenueCsv,
} from '../controllers/reportController.js';

const router = express.Router();

// GET /api/reports/revenue?from=&to=&customerId=&status=
router.get('/revenue', getRevenueReport);

// GET /api/reports/overdue
router.get('/overdue', getOverdueReport);

// GET /api/reports/subscriptions
router.get('/subscriptions', getSubscriptionReport);

// GET /api/reports/export  – CSV download
router.get('/export', exportRevenueCsv);

export default router;

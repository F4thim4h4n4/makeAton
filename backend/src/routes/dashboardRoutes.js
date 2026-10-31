import express from 'express';
import {
  getSummary,
  getCharts,
  getRecent,
} from '../controllers/dashboardController.js';

const router = express.Router();

// GET /api/dashboard/summary  – KPI totals
router.get('/summary', getSummary);

// GET /api/dashboard/charts?period=30d|90d|12m  – revenue data points
router.get('/charts', getCharts);

// GET /api/dashboard/recent  – recent subscriptions, payments, renewals
router.get('/recent', getRecent);

export default router;

const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { runRecurringBilling } = require('../services/billingService');
const { authenticate, requireRole } = require('../middleware/auth');

// Trigger Recurring Billing Run (Member 3 API)
router.post('/run-recurring', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const { asOfDate, triggerType = 'manual' } = req.body;
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);

    const results = runRecurringBilling(targetDate, triggerType);
    res.json({
      message: `Recurring billing completed for target date: ${targetDate}`,
      ...results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Preview subscriptions currently due for billing
router.get('/due', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const asOfDate = req.query.date || new Date().toISOString().slice(0, 10);
    const dueSubscriptions = db.prepare(`
      SELECT s.*, c.name as customer_name, c.company as customer_company,
             p.name as plan_name, p.billing_interval, p.price as plan_price
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
        AND s.next_billing_date <= ?
        AND (s.expiry_date IS NULL OR s.expiry_date >= ?)
      ORDER BY s.next_billing_date ASC
    `).all(asOfDate, asOfDate);

    res.json({
      asOfDate,
      count: dueSubscriptions.length,
      subscriptions: dueSubscriptions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit log of past billing runs
router.get('/runs', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const runs = db.prepare(`SELECT * FROM billing_runs ORDER BY id DESC LIMIT 50`).all();
    const parsed = runs.map(r => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : []
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { recordPayment } = require('../services/paymentService');
const { authenticate, requireRole } = require('../middleware/auth');

// List payments
router.get('/', authenticate, (req, res) => {
  try {
    let query = `
      SELECT p.*, i.invoice_number, i.total_amount as invoice_total, i.balance_due as invoice_balance,
             c.name as customer_name, c.company as customer_company
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON p.customer_id = c.id
    `;
    const params = [];
    const conditions = [];

    // RBAC: Customer can only see their own payments
    if (req.user.role === 'customer') {
      conditions.push(`c.user_id = ?`);
      params.push(req.user.userId);
    } else {
      if (req.query.invoiceId) {
        conditions.push(`p.invoice_id = ?`);
        params.push(req.query.invoiceId);
      }
      if (req.query.customerId) {
        conditions.push(`p.customer_id = ?`);
        params.push(req.query.customerId);
      }
      if (req.query.method) {
        conditions.push(`p.payment_method = ?`);
        params.push(req.query.method);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY p.id DESC`;
    const payments = db.prepare(query).all(...params);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record payment (Member 3 API)
router.post('/', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, paymentDate, transactionReference, notes } = req.body;

    if (!invoiceId || amount === undefined || !paymentMethod) {
      return res.status(400).json({ error: 'invoiceId, amount, and paymentMethod are required' });
    }

    const result = recordPayment({
      invoiceId: Number(invoiceId),
      amount: Number(amount),
      paymentMethod,
      paymentDate,
      transactionReference,
      notes
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: result.payment,
      updatedInvoice: result.invoice
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Payment receipt details
router.get('/:id', authenticate, (req, res) => {
  try {
    const payment = db.prepare(`
      SELECT p.*, i.invoice_number, i.total_amount as invoice_total, i.balance_due as invoice_balance,
             c.name as customer_name, c.email as customer_email, c.company as customer_company
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON p.customer_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

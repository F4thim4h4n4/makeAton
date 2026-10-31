const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { roundCurrency } = require('../services/pricingService');
const { authenticate } = require('../middleware/auth');

// Main Dashboard KPI Metrics (Admin/Staff)
router.get('/stats', authenticate, (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Active Subscriptions
    const activeSubsRow = db.prepare(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`).get();
    const activeSubs = activeSubsRow?.count || 0;

    // 2. Total Revenue Received (cash collected through completed payments)
    const revRow = db.prepare(`SELECT SUM(amount) as total FROM payments WHERE status = 'completed'`).get();
    const totalRevenueReceived = roundCurrency(revRow?.total || 0);

    // 3. Outstanding Receivables (total unpaid balance on open/confirmed invoices)
    const recRow = db.prepare(`
      SELECT SUM(balance_due) as total FROM invoices WHERE status IN ('draft', 'confirmed') AND balance_due > 0
    `).get();
    const outstandingReceivables = roundCurrency(recRow?.total || 0);

    // 4. Overdue Invoices
    const overdueRow = db.prepare(`
      SELECT COUNT(*) as count, SUM(balance_due) as total
      FROM invoices
      WHERE due_date < ? AND balance_due > 0 AND status NOT IN ('paid', 'cancelled')
    `).get(today);
    const overdueInvoicesCount = overdueRow?.count || 0;
    const overdueInvoicesAmount = roundCurrency(overdueRow?.total || 0);

    // 5. Total Invoiced Amount
    const totalInvoicedRow = db.prepare(`SELECT SUM(total_amount) as total FROM invoices WHERE status != 'cancelled'`).get();
    const totalInvoiced = roundCurrency(totalInvoicedRow?.total || 0);

    // 6. Subscriptions by Interval breakdown
    const intervalBreakdown = db.prepare(`
      SELECT billing_interval, COUNT(*) as count
      FROM subscriptions
      GROUP BY billing_interval
    `).all();

    // 7. Invoices by Status breakdown
    const invoiceStatusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(total_amount) as total
      FROM invoices
      GROUP BY status
    `).all();

    res.json({
      activeSubscriptions: activeSubs,
      totalRevenueReceived,
      outstandingReceivables,
      overdueInvoicesCount,
      overdueInvoicesAmount,
      totalInvoiced,
      intervalBreakdown,
      invoiceStatusBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent Activities
router.get('/recent', authenticate, (req, res) => {
  try {
    const recentPayments = db.prepare(`
      SELECT p.*, c.name as customer_name, i.invoice_number
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      JOIN invoices i ON p.invoice_id = i.id
      ORDER BY p.id DESC LIMIT 5
    `).all();

    const recentInvoices = db.prepare(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      ORDER BY i.id DESC LIMIT 5
    `).all();

    const upcomingDue = db.prepare(`
      SELECT s.*, c.name as customer_name, p.name as plan_name, p.price as plan_price
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
      ORDER BY s.next_billing_date ASC LIMIT 5
    `).all();

    res.json({
      recentPayments,
      recentInvoices,
      upcomingDue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Self-Service Portal Endpoint
router.get('/portal', authenticate, (req, res) => {
  try {
    let customer;
    if (req.user.role === 'customer') {
      customer = db.prepare(`SELECT * FROM customers WHERE user_id = ?`).get(req.user.userId);
    } else {
      // Admin/staff viewing portal preview for a specific customer or first customer
      const targetId = req.query.customerId || 1;
      customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(targetId);
    }

    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const subscriptions = db.prepare(`
      SELECT s.*, p.name as plan_name, p.price as plan_price, p.billing_interval
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.customer_id = ?
      ORDER BY s.id DESC
    `).all(customer.id);

    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE customer_id = ?
      ORDER BY id DESC
    `).all(customer.id);

    const payments = db.prepare(`
      SELECT p.*, i.invoice_number
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.customer_id = ?
      ORDER BY p.id DESC
    `).all(customer.id);

    const totalSpent = roundCurrency(payments.reduce((sum, p) => sum + p.amount, 0));
    const currentOutstanding = roundCurrency(invoices.reduce((sum, i) => i.status !== 'cancelled' ? sum + i.balance_due : sum, 0));

    res.json({
      customer,
      stats: {
        activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
        totalInvoices: invoices.length,
        totalSpent,
        currentOutstanding
      },
      subscriptions,
      invoices,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

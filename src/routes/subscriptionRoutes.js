const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { advanceBillingDate } = require('../services/billingService');
const { authenticate, requireRole } = require('../middleware/auth');

// --- CUSTOMERS ---
router.get('/customers', authenticate, (req, res) => {
  // If customer, only return their own customer record!
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(req.user.userId);
    return res.json(cust ? [cust] : []);
  }

  const customers = db.prepare(`SELECT * FROM customers ORDER BY id DESC`).all();
  res.json(customers);
});

router.post('/customers', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const { name, email, phone = '', company = '', address = '', tax_id = '' } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const result = db.prepare(`
      INSERT INTO customers (name, email, phone, company, address, tax_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), email.toLowerCase().trim(), phone, company, address, tax_id);

    res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(result.lastInsertRowid)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- SUBSCRIPTIONS ---
router.get('/subscriptions', authenticate, (req, res) => {
  let query = `
    SELECT s.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
           p.name as plan_name, p.price as plan_price, pr.name as product_name
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN plans p ON s.plan_id = p.id
    JOIN products pr ON p.product_id = pr.id
  `;
  const params = [];

  if (req.user.role === 'customer') {
    query += ` WHERE c.user_id = ?`;
    params.push(req.user.userId);
  } else {
    const conditions = [];
    if (req.query.status) {
      conditions.push(`s.status = ?`);
      params.push(req.query.status);
    }
    if (req.query.customerId) {
      conditions.push(`s.customer_id = ?`);
      params.push(req.query.customerId);
    }
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }
  }

  query += ` ORDER BY s.id DESC`;
  const subs = db.prepare(query).all(...params);

  // Attach line items to each subscription
  const lines = db.prepare(`
    SELECT sl.*, pr.name as product_name, pv.variant_name
    FROM subscription_lines sl
    JOIN products pr ON sl.product_id = pr.id
    LEFT JOIN product_variants pv ON sl.variant_id = pv.id
  `).all();

  const linesMap = {};
  lines.forEach(l => {
    if (!linesMap[l.subscription_id]) linesMap[l.subscription_id] = [];
    linesMap[l.subscription_id].push(l);
  });

  const enriched = subs.map(s => ({
    ...s,
    lines: linesMap[s.id] || []
  }));

  res.json(enriched);
});

router.post('/subscriptions', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const {
      customer_id, plan_id, start_date = new Date().toISOString().slice(0, 10),
      expiry_date = null, payment_terms = 'Net 15 days', lines = []
    } = req.body;

    if (!customer_id || !plan_id) {
      return res.status(400).json({ error: 'customer_id and plan_id are required' });
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const year = new Date().getFullYear();
    const countRow = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get();
    const subNumber = `SUB-${year}-${String((countRow?.count || 0) + 1).padStart(4, '0')}`;
    const nextBillingDate = start_date; // due immediately or on start_date

    db.exec('BEGIN TRANSACTION;');
    let subId;
    try {
      const result = db.prepare(`
        INSERT INTO subscriptions (
          subscription_number, customer_id, plan_id, start_date, expiry_date,
          billing_interval, next_billing_date, status, payment_terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(subNumber, customer_id, plan_id, start_date, expiry_date, plan.billing_interval, nextBillingDate, payment_terms);

      subId = Number(result.lastInsertRowid);

      if (Array.isArray(lines) && lines.length > 0) {
        const insertLine = db.prepare(`
          INSERT INTO subscription_lines (
            subscription_id, product_id, variant_id, quantity, unit_price, discount_rule_id, tax_rule_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const line of lines) {
          insertLine.run(
            subId, line.product_id, line.variant_id || null,
            Number(line.quantity) || 1, Number(line.unit_price) || 0,
            line.discount_rule_id || null, line.tax_rule_id || null
          );
        }
      } else {
        // Fallback: create default line item from plan's product
        const prod = db.prepare('SELECT sales_price FROM products WHERE id = ?').get(plan.product_id);
        db.prepare(`
          INSERT INTO subscription_lines (subscription_id, product_id, quantity, unit_price)
          VALUES (?, ?, 1, ?)
        `).run(subId, plan.product_id, prod ? prod.sales_price : plan.price);
      }

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    const created = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/subscriptions/:id/status', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'expired'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?').run(status, sub.id);
    res.json({ message: `Subscription status updated to ${status}`, subscription: { ...sub, status } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- QUOTATIONS ---
router.get('/quotations', authenticate, (req, res) => {
  const quotes = db.prepare(`
    SELECT q.*, c.name as customer_name, p.name as plan_name
    FROM quotations q
    JOIN customers c ON q.customer_id = c.id
    JOIN plans p ON q.plan_id = p.id
    ORDER BY q.id DESC
  `).all();
  res.json(quotes);
});

module.exports = router;

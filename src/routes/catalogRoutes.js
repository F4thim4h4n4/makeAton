const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

// --- PRODUCTS ---
router.get('/products', (req, res) => {
  const products = db.prepare(`SELECT * FROM products ORDER BY id DESC`).all();
  // Fetch variants for each
  const variants = db.prepare(`SELECT * FROM product_variants WHERE is_active = 1`).all();
  const variantMap = {};
  variants.forEach(v => {
    if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
    variantMap[v.product_id].push(v);
  });

  const enriched = products.map(p => ({
    ...p,
    variants: variantMap[p.id] || []
  }));

  res.json(enriched);
});

router.post('/products', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const { code, name, type = 'software', sales_price, cost_price = 0, description = '', variants = [] } = req.body;
    if (!code || !name || sales_price === undefined || Number(sales_price) < 0) {
      return res.status(400).json({ error: 'Valid code, name, and non-negative sales_price are required' });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      const result = db.prepare(`
        INSERT INTO products (code, name, type, sales_price, cost_price, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(code.trim(), name.trim(), type, Number(sales_price), Number(cost_price), description);

      const productId = Number(result.lastInsertRowid);

      if (Array.isArray(variants)) {
        const insertVar = db.prepare(`
          INSERT INTO product_variants (product_id, variant_name, attribute_type, price_adjustment)
          VALUES (?, ?, ?, ?)
        `);
        for (const v of variants) {
          if (v.variant_name) {
            insertVar.run(productId, v.variant_name, v.attribute_type || 'edition', Number(v.price_adjustment) || 0);
          }
        }
      }

      db.exec('COMMIT;');
      const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      res.status(201).json(created);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- PLANS ---
router.get('/plans', (req, res) => {
  const plans = db.prepare(`
    SELECT p.*, pr.name as product_name, pr.code as product_code
    FROM plans p
    JOIN products pr ON p.product_id = pr.id
    ORDER BY p.id DESC
  `).all();
  res.json(plans);
});

router.post('/plans', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const {
      product_id, name, billing_interval, price, min_quantity = 1,
      start_date, end_date, is_pausable = 1, is_renewable = 1, allows_early_closure = 1
    } = req.body;

    const validIntervals = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validIntervals.includes(billing_interval)) {
      return res.status(400).json({ error: `Interval must be one of: ${validIntervals.join(', ')}` });
    }

    if (!name || !product_id || price === undefined || Number(price) < 0) {
      return res.status(400).json({ error: 'Valid name, product_id, and non-negative price are required' });
    }

    const result = db.prepare(`
      INSERT INTO plans (
        product_id, name, billing_interval, price, min_quantity,
        start_date, end_date, is_pausable, is_renewable, allows_early_closure
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product_id, name, billing_interval, Number(price), Number(min_quantity),
      start_date || null, end_date || null, is_pausable ? 1 : 0, is_renewable ? 1 : 0, allows_early_closure ? 1 : 0
    );

    const created = db.prepare('SELECT * FROM plans WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- TAX RULES ---
router.get('/taxes', (req, res) => {
  const taxes = db.prepare('SELECT * FROM tax_rules ORDER BY id ASC').all();
  res.json(taxes);
});

router.post('/taxes', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { name, rate, description = '' } = req.body;
    if (!name || rate === undefined || Number(rate) < 0) {
      return res.status(400).json({ error: 'Valid name and non-negative rate are required' });
    }

    const result = db.prepare(`
      INSERT INTO tax_rules (name, rate, description)
      VALUES (?, ?, ?)
    `).run(name.trim(), Number(rate), description);

    res.status(201).json(db.prepare('SELECT * FROM tax_rules WHERE id = ?').get(Number(result.lastInsertRowid)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- DISCOUNT RULES ---
router.get('/discounts', (req, res) => {
  const discounts = db.prepare('SELECT * FROM discount_rules ORDER BY id DESC').all();
  res.json(discounts);
});

router.post('/discounts', authenticate, requireRole('admin'), (req, res) => {
  try {
    const {
      code, name, discount_type, value, min_purchase_amount = 0,
      min_quantity = 1, start_date, end_date, max_uses = 0
    } = req.body;

    if (!['fixed', 'percentage'].includes(discount_type)) {
      return res.status(400).json({ error: 'discount_type must be fixed or percentage' });
    }
    if (!code || !name || value === undefined || Number(value) <= 0) {
      return res.status(400).json({ error: 'Code, name, and positive discount value are required' });
    }

    const result = db.prepare(`
      INSERT INTO discount_rules (
        code, name, discount_type, value, min_purchase_amount,
        min_quantity, start_date, end_date, max_uses
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.toUpperCase().trim(), name.trim(), discount_type, Number(value),
      Number(min_purchase_amount) || 0, Number(min_quantity) || 1,
      start_date || null, end_date || null, Number(max_uses) || 0
    );

    res.status(201).json(db.prepare('SELECT * FROM discount_rules WHERE id = ?').get(Number(result.lastInsertRowid)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

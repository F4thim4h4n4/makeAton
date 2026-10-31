const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { generateInvoiceForSubscription, getOverdueInvoices } = require('../services/billingService');
const { authenticate, requireRole } = require('../middleware/auth');

// List Invoices (with filters & customer RBAC)
router.get('/', authenticate, (req, res) => {
  try {
    let query = `
      SELECT i.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
             s.subscription_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
    `;
    const params = [];
    const conditions = [];

    // RBAC: Customer can only access their own invoices!
    if (req.user.role === 'customer') {
      conditions.push(`c.user_id = ?`);
      params.push(req.user.userId);
    } else {
      if (req.query.customerId) {
        conditions.push(`i.customer_id = ?`);
        params.push(req.query.customerId);
      }
      if (req.query.subscriptionId) {
        conditions.push(`i.subscription_id = ?`);
        params.push(req.query.subscriptionId);
      }
      if (req.query.status) {
        if (req.query.status === 'overdue') {
          const today = new Date().toISOString().slice(0, 10);
          conditions.push(`i.due_date < ? AND i.balance_due > 0 AND i.status NOT IN ('paid', 'cancelled')`);
          params.push(today);
        } else {
          conditions.push(`i.status = ?`);
          params.push(req.query.status);
        }
      }
      if (req.query.startDate) {
        conditions.push(`i.issue_date >= ?`);
        params.push(req.query.startDate);
      }
      if (req.query.endDate) {
        conditions.push(`i.issue_date <= ?`);
        params.push(req.query.endDate);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY i.id DESC`;
    const invoices = db.prepare(query).all(...params);

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Overdue Invoices Aging Report
router.get('/reports/overdue', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const asOfDate = req.query.date || new Date().toISOString().slice(0, 10);
    const report = getOverdueInvoices(asOfDate);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invoice Detail
router.get('/:id', authenticate, (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.company as customer_company,
             c.email as customer_email, c.address as customer_address, c.tax_id as customer_tax_id,
             s.subscription_number, s.billing_interval
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Security check: ensure customer is owner
    if (req.user.role === 'customer') {
      const cust = db.prepare('SELECT user_id FROM customers WHERE id = ?').get(invoice.customer_id);
      if (!cust || cust.user_id !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden: Access to this invoice is restricted' });
      }
    }

    const lines = db.prepare(`SELECT * FROM invoice_lines WHERE invoice_id = ?`).all(invoice.id);
    const payments = db.prepare(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC`).all(invoice.id);

    res.json({
      ...invoice,
      lines,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Invoice for Subscription (Member 3 API)
router.post('/generate/:subscriptionId', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const outcome = generateInvoiceForSubscription(req.params.subscriptionId, req.body);
    if (outcome.skipped) {
      return res.status(409).json({
        message: 'Invoice skipped to prevent duplicate billing',
        reason: outcome.reason,
        existingInvoice: outcome.existingInvoice
      });
    }
    res.status(201).json(outcome);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Invoice Status (Confirm / Cancel)
router.patch('/:id/status', authenticate, requireRole('admin', 'staff'), (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Status can only be transitioned to draft, confirmed, or cancelled' });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (invoice.status === 'paid' && status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel a fully paid invoice without reversing payments first' });
    }

    db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, invoice.id);
    res.json({ message: `Invoice #${invoice.invoice_number} status updated to ${status}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Printable View (HTML)
router.get('/:id/print', authenticate, (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, c.name as customer_name, c.company as customer_company,
             c.email as customer_email, c.address as customer_address, c.tax_id as customer_tax_id,
             s.subscription_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!invoice) return res.status(404).send('Invoice not found');

    const lines = db.prepare(`SELECT * FROM invoice_lines WHERE invoice_id = ?`).all(invoice.id);
    const payments = db.prepare(`SELECT * FROM payments WHERE invoice_id = ?`).all(invoice.id);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number} - Brightloop Software</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: #4338ca; }
          .meta { text-align: right; }
          .meta h2 { margin: 0; color: #0f172a; font-size: 20px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 5px; }
          .badge-paid { background: #dcfce7; color: #15803d; }
          .badge-confirmed { background: #dbeafe; color: #1d4ed8; }
          .badge-cancelled { background: #fee2e2; color: #b91c1c; }
          .parties { display: flex; justify-content: space-between; margin: 30px 0; }
          .party-card { width: 45%; }
          .party-card h4 { margin: 0 0 8px 0; color: #64748b; font-size: 13px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; background: #f8fafc; padding: 12px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .text-right { text-align: right; }
          .totals { margin-top: 25px; margin-left: auto; width: 320px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569; }
          .totals-row.grand { font-size: 18px; font-weight: 700; color: #0f172a; border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 10px; }
          .totals-row.balance { color: #dc2626; font-weight: 700; font-size: 16px; background: #fef2f2; padding: 8px; border-radius: 6px; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
          @media print { .no-print { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px;">
          <button onclick="window.print()" style="background: #4338ca; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">🖨️ Print / Save as PDF</button>
          <button onclick="window.close()" style="background: #e2e8f0; color: #334155; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
        </div>
        <div class="header">
          <div>
            <div class="logo">⚡ Brightloop Software</div>
            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Subscription Management & Recurring Cloud Services</div>
            <div style="font-size: 13px; color: #64748b;">billing@brightloop.com | EIN: 98-4412093</div>
          </div>
          <div class="meta">
            <h2>INVOICE</h2>
            <div style="font-weight: 600; color: #4338ca; font-size: 15px;">${invoice.invoice_number}</div>
            <span class="badge badge-${invoice.status}">${invoice.status}</span>
          </div>
        </div>

        <div class="parties">
          <div class="party-card">
            <h4>Billed To</h4>
            <div style="font-weight: 700; font-size: 16px;">${invoice.customer_name}</div>
            ${invoice.customer_company ? `<div>${invoice.customer_company}</div>` : ''}
            <div>${invoice.customer_email}</div>
            ${invoice.customer_address ? `<div>${invoice.customer_address}</div>` : ''}
            ${invoice.customer_tax_id ? `<div style="font-size: 12px; color: #64748b;">Tax ID: ${invoice.customer_tax_id}</div>` : ''}
          </div>
          <div class="party-card" style="text-align: right;">
            <h4>Invoice Details</h4>
            <div><strong>Issue Date:</strong> ${invoice.issue_date}</div>
            <div><strong>Due Date:</strong> ${invoice.due_date}</div>
            <div><strong>Billing Period:</strong> ${invoice.period_start} to ${invoice.period_end}</div>
            ${invoice.subscription_number ? `<div><strong>Subscription:</strong> ${invoice.subscription_number}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Discount</th>
              <th class="text-right">Tax Rate</th>
              <th class="text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map(l => `
              <tr>
                <td>
                  <strong>${l.product_name}</strong>
                  ${l.variant_name ? `<div style="font-size: 12px; color: #64748b;">Variant: ${l.variant_name}</div>` : ''}
                </td>
                <td class="text-right">${l.quantity}</td>
                <td class="text-right">$${Number(l.unit_price).toFixed(2)}</td>
                <td class="text-right">-$${Number(l.discount_amount).toFixed(2)}</td>
                <td class="text-right">${l.tax_rate}%</td>
                <td class="text-right"><strong>$${Number(l.line_total).toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>$${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Discounts Applied:</span>
            <span>-$${Number(invoice.discount_total).toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Taxes & Duties:</span>
            <span>+$${Number(invoice.tax_total).toFixed(2)}</span>
          </div>
          <div class="totals-row grand">
            <span>Total Amount:</span>
            <span>$${Number(invoice.total_amount).toFixed(2)}</span>
          </div>
          <div class="totals-row" style="color: #15803d; font-weight: 600;">
            <span>Amount Paid:</span>
            <span>$${Number(invoice.amount_paid).toFixed(2)}</span>
          </div>
          <div class="totals-row balance">
            <span>Balance Due:</span>
            <span>$${Number(invoice.balance_due).toFixed(2)}</span>
          </div>
        </div>

        ${payments.length > 0 ? `
          <div style="margin-top: 30px;">
            <h4 style="margin: 0 0 10px 0; color: #475569; font-size: 14px; text-transform: uppercase;">Payment History</h4>
            <table>
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map(p => `
                  <tr>
                    <td>${p.payment_number}</td>
                    <td>${p.payment_date}</td>
                    <td>${p.payment_method.toUpperCase().replace('_', ' ')}</td>
                    <td>${p.transaction_reference || 'N/A'}</td>
                    <td class="text-right">$${Number(p.amount).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="footer">
          Thank you for choosing Brightloop Software! For questions regarding this invoice, please reach out to billing@brightloop.com.
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send(`Error generating print view: ${err.message}`);
  }
});

module.exports = router;

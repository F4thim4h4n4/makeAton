const { db } = require('../database/db');
const { roundCurrency, calculateLineItem, calculateInvoiceTotals } = require('./pricingService');

/**
 * Calculates the next billing date based on the billing interval
 */
function advanceBillingDate(dateStr, interval) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }

  switch (interval.toLowerCase()) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Formats a date string as YYYY-MM-DD
 */
function formatDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Adds days to a date string
 */
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Generates next sequential invoice number (e.g. INV-2026-0001)
 */
function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?
  `).get(`INV-${year}-%`);

  const nextSeq = (row?.count || 0) + 1;
  return `INV-${year}-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Generates an invoice for a specific subscription.
 * Fully idempotent: prevents duplicate invoices for the same subscription and period.
 */
function generateInvoiceForSubscription(subscriptionId, options = {}) {
  const sub = db.prepare(`
    SELECT s.*, c.name as customer_name, c.email as customer_email,
           p.name as plan_name, p.billing_interval as plan_interval
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = ?
  `).get(subscriptionId);

  if (!sub) {
    throw new Error(`Subscription #${subscriptionId} not found`);
  }

  if (['closed', 'expired'].includes(sub.status)) {
    throw new Error(`Cannot bill subscription in status: ${sub.status}`);
  }

  const issueDate = options.issueDate || formatDate();
  const periodStart = options.periodStart || sub.next_billing_date || issueDate;
  const periodEnd = options.periodEnd || advanceBillingDate(periodStart, sub.billing_interval);
  
  // Payment terms: Net 15 by default or derived from options
  const paymentTermDays = options.paymentTermsDays || 15;
  const dueDate = options.dueDate || addDays(issueDate, paymentTermDays);

  // IDEMPOTENCY CHECK: Ensure an invoice does not already exist for this subscription and period
  const existing = db.prepare(`
    SELECT id, invoice_number, total_amount, status
    FROM invoices
    WHERE subscription_id = ? AND period_start = ? AND period_end = ?
  `).get(sub.id, periodStart, periodEnd);

  if (existing) {
    return {
      success: false,
      skipped: true,
      reason: `Invoice ${existing.invoice_number} already exists for subscription #${sub.id} covering period ${periodStart} to ${periodEnd}`,
      existingInvoice: existing
    };
  }

  // Fetch subscription line items
  const lines = db.prepare(`
    SELECT sl.*, 
           pr.name as product_name, pr.sales_price as product_base_price,
           pv.variant_name, pv.price_adjustment as variant_adjustment,
           tr.rate as tax_rate, tr.name as tax_name,
           dr.id as dr_id, dr.code as dr_code, dr.name as dr_name, dr.discount_type,
           dr.value as discount_value, dr.min_purchase_amount, dr.min_quantity,
           dr.start_date as dr_start, dr.end_date as dr_end, dr.max_uses, dr.current_uses,
           dr.is_active as dr_active
    FROM subscription_lines sl
    JOIN products pr ON sl.product_id = pr.id
    LEFT JOIN product_variants pv ON sl.variant_id = pv.id
    LEFT JOIN tax_rules tr ON sl.tax_rule_id = tr.id
    LEFT JOIN discount_rules dr ON sl.discount_rule_id = dr.id
    WHERE sl.subscription_id = ?
  `).all(sub.id);

  if (!lines || lines.length === 0) {
    throw new Error(`Subscription #${subscriptionId} has no line items`);
  }

  const calculatedLines = [];
  const discountRuleUsageUpdates = [];

  for (const line of lines) {
    const discountRule = line.dr_id ? {
      id: line.dr_id,
      code: line.dr_code,
      name: line.dr_name,
      discount_type: line.discount_type,
      value: line.discount_value,
      min_purchase_amount: line.min_purchase_amount,
      min_quantity: line.min_quantity,
      start_date: line.dr_start,
      end_date: line.dr_end,
      max_uses: line.max_uses,
      current_uses: line.current_uses,
      is_active: line.dr_active
    } : null;

    const calc = calculateLineItem({
      basePrice: line.unit_price || line.product_base_price,
      variantAdjustment: line.variant_adjustment || 0,
      quantity: line.quantity,
      discountRule,
      taxRate: line.tax_rate || 0,
      currentDate: issueDate
    });

    if (calc.discountAmount > 0 && line.dr_id) {
      discountRuleUsageUpdates.push(line.dr_id);
    }

    calculatedLines.push({
      productId: line.product_id,
      productName: line.product_name,
      variantName: line.variant_name || null,
      ...calc
    });
  }

  const totals = calculateInvoiceTotals(calculatedLines);
  const invoiceNumber = generateInvoiceNumber();
  const initialStatus = options.status || 'confirmed';

  // Atomic database transaction
  db.exec('BEGIN TRANSACTION;');
  let invoiceId;
  try {
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        invoice_number, subscription_id, customer_id, issue_date, due_date,
        period_start, period_end, subtotal, discount_total, tax_total,
        total_amount, amount_paid, balance_due, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);

    const result = insertInvoice.run(
      invoiceNumber,
      sub.id,
      sub.customer_id,
      issueDate,
      dueDate,
      periodStart,
      periodEnd,
      totals.subtotal,
      totals.discountTotal,
      totals.taxTotal,
      totals.totalAmount,
      totals.totalAmount, // balance_due initially equals total_amount
      initialStatus,
      options.notes || `Recurring billing for ${sub.plan_name} (${sub.billing_interval})`
    );

    invoiceId = Number(result.lastInsertRowid);

    // Insert line items
    const insertLine = db.prepare(`
      INSERT INTO invoice_lines (
        invoice_id, product_id, product_name, variant_name,
        quantity, unit_price, discount_amount, tax_rate, tax_amount, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const cl of calculatedLines) {
      insertLine.run(
        invoiceId,
        cl.productId,
        cl.productName,
        cl.variantName,
        cl.quantity,
        cl.unitPrice,
        cl.discountAmount,
        cl.taxRate,
        cl.taxAmount,
        cl.lineTotal
      );
    }

    // Increment discount rules usage
    for (const ruleId of discountRuleUsageUpdates) {
      db.prepare(`UPDATE discount_rules SET current_uses = current_uses + 1 WHERE id = ?`).run(ruleId);
    }

    // Advance subscription's next_billing_date and last_billed_date
    const nextDate = advanceBillingDate(periodStart, sub.billing_interval);
    db.prepare(`
      UPDATE subscriptions
      SET last_billed_date = ?, next_billing_date = ?
      WHERE id = ?
    `).run(periodStart, nextDate, sub.id);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const createdInvoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  return {
    success: true,
    invoice: createdInvoice,
    lineItems: calculatedLines
  };
}

/**
 * Executes the Recurring Billing batch job
 * Scans active subscriptions due on or before asOfDate
 */
function runRecurringBilling(asOfDate = formatDate(), triggerType = 'scheduled') {
  const dueSubscriptions = db.prepare(`
    SELECT s.id, s.subscription_number, s.customer_id, s.next_billing_date, s.expiry_date
    FROM subscriptions s
    WHERE s.status = 'active'
      AND s.next_billing_date <= ?
      AND (s.expiry_date IS NULL OR s.expiry_date >= ?)
    ORDER BY s.next_billing_date ASC
  `).all(asOfDate, asOfDate);

  const results = {
    asOfDate,
    triggerType,
    subscriptionsChecked: dueSubscriptions.length,
    invoicesGenerated: 0,
    totalBilledAmount: 0,
    skipped: 0,
    errors: [],
    details: []
  };

  for (const sub of dueSubscriptions) {
    try {
      const outcome = generateInvoiceForSubscription(sub.id, {
        issueDate: asOfDate,
        status: 'confirmed'
      });

      if (outcome.success) {
        results.invoicesGenerated++;
        results.totalBilledAmount += outcome.invoice.total_amount;
        results.details.push({
          subscriptionId: sub.id,
          subscriptionNumber: sub.subscription_number,
          status: 'generated',
          invoiceNumber: outcome.invoice.invoice_number,
          amount: outcome.invoice.total_amount
        });
      } else if (outcome.skipped) {
        results.skipped++;
        results.details.push({
          subscriptionId: sub.id,
          subscriptionNumber: sub.subscription_number,
          status: 'skipped',
          reason: outcome.reason
        });
      }
    } catch (err) {
      results.errors.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        error: err.message
      });
      results.details.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscription_number,
        status: 'error',
        error: err.message
      });
    }
  }

  results.totalBilledAmount = roundCurrency(results.totalBilledAmount);

  // Persist billing run audit
  try {
    db.prepare(`
      INSERT INTO billing_runs (
        run_date, trigger_type, subscriptions_checked, invoices_generated,
        total_billed_amount, status, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      triggerType,
      results.subscriptionsChecked,
      results.invoicesGenerated,
      results.totalBilledAmount,
      results.errors.length > 0 ? (results.invoicesGenerated > 0 ? 'partial' : 'failed') : 'success',
      JSON.stringify(results.details)
    );
  } catch (auditErr) {
    console.error('Failed to log billing run audit:', auditErr);
  }

  return results;
}

/**
 * Fetches overdue invoices with aging breakdown
 */
function getOverdueInvoices(asOfDate = formatDate()) {
  const rows = db.prepare(`
    SELECT i.*, c.name as customer_name, c.email as customer_email,
           CAST((julianday(?) - julianday(i.due_date)) AS INTEGER) as days_overdue
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.due_date < ?
      AND i.balance_due > 0
      AND i.status NOT IN ('paid', 'cancelled')
    ORDER BY i.due_date ASC
  `).all(asOfDate, asOfDate);

  const summary = {
    totalOverdueCount: rows.length,
    totalOverdueAmount: roundCurrency(rows.reduce((sum, r) => sum + r.balance_due, 0)),
    aging: {
      under30Days: 0,
      days31to60: 0,
      over60Days: 0
    },
    invoices: rows
  };

  for (const row of rows) {
    if (row.days_overdue <= 30) {
      summary.aging.under30Days += row.balance_due;
    } else if (row.days_overdue <= 60) {
      summary.aging.days31to60 += row.balance_due;
    } else {
      summary.aging.over60Days += row.balance_due;
    }
  }

  summary.aging.under30Days = roundCurrency(summary.aging.under30Days);
  summary.aging.days31to60 = roundCurrency(summary.aging.days31to60);
  summary.aging.over60Days = roundCurrency(summary.aging.over60Days);

  return summary;
}

module.exports = {
  advanceBillingDate,
  generateInvoiceNumber,
  generateInvoiceForSubscription,
  runRecurringBilling,
  getOverdueInvoices
};

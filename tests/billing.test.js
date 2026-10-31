const test = require('node:test');
const assert = require('node:assert/strict');
const { db, initDatabase } = require('../src/database/db');
const { seed } = require('../src/database/seed');
const { calculateLineItem, calculateInvoiceTotals } = require('../src/services/pricingService');
const { generateInvoiceForSubscription, runRecurringBilling, getOverdueInvoices } = require('../src/services/billingService');
const { recordPayment } = require('../src/services/paymentService');

test('Billing & Payment Module (Member 3) Test Suite', async (t) => {
  // Re-seed database before tests
  seed();

  let generatedInvoiceId = null;

  await t.test('1. Pricing calculation: Base + Variant + Discount + Tax order', () => {
    // Problem statement example: Base 2000, Variant +560 => Unit 2560.
    // With 20% discount on 2560 = 512 discount => Net 2048.
    // 18% Tax on 2048 = 368.64 => Line Total = 2416.64.
    const result = calculateLineItem({
      basePrice: 2000,
      variantAdjustment: 560,
      quantity: 1,
      discountRule: { is_active: 1, discount_type: 'percentage', value: 20 },
      taxRate: 18
    });

    assert.equal(result.unitPrice, 2560.00);
    assert.equal(result.lineBaseTotal, 2560.00);
    assert.equal(result.discountAmount, 512.00);
    assert.equal(result.netAmount, 2048.00);
    assert.equal(result.taxAmount, 368.64);
    assert.equal(result.lineTotal, 2416.64);
  });

  await t.test('2. Generate invoice for active subscription', () => {
    // Sub 1 is Acme Corp's active subscription due today
    const sub1 = db.prepare(`SELECT id FROM subscriptions WHERE subscription_number = 'SUB-2026-0001'`).get();
    assert.ok(sub1, 'Subscription 1 should exist');

    const outcome = generateInvoiceForSubscription(sub1.id, {
      issueDate: '2026-10-31',
      periodStart: '2026-10-31',
      periodEnd: '2026-11-30'
    });

    assert.equal(outcome.success, true);
    assert.ok(outcome.invoice.invoice_number.startsWith('INV-'));
    assert.equal(outcome.invoice.total_amount, 2416.64);
    assert.equal(outcome.invoice.balance_due, 2416.64);
    assert.equal(outcome.invoice.amount_paid, 0);
    assert.equal(outcome.invoice.status, 'confirmed');

    generatedInvoiceId = outcome.invoice.id;

    // Verify lines were written
    const lines = db.prepare(`SELECT * FROM invoice_lines WHERE invoice_id = ?`).all(outcome.invoice.id);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].variant_name, 'Odoo / Enterprise Edition');
  });

  await t.test('3. Idempotency: Prevent duplicate invoice generation for same period', () => {
    const sub1 = db.prepare(`SELECT id FROM subscriptions WHERE subscription_number = 'SUB-2026-0001'`).get();

    // Attempting to generate again for the same period
    const duplicateAttempt = generateInvoiceForSubscription(sub1.id, {
      issueDate: '2026-10-31',
      periodStart: '2026-10-31',
      periodEnd: '2026-11-30'
    });

    assert.equal(duplicateAttempt.success, false);
    assert.equal(duplicateAttempt.skipped, true);
    assert.match(duplicateAttempt.reason, /already exists/);
  });

  await t.test('4. Payment recording: Partial payment updates balance and status', () => {
    assert.ok(generatedInvoiceId, 'Generated invoice ID must be set');

    // Record partial payment of $1000
    const paymentResult = recordPayment({
      invoiceId: generatedInvoiceId,
      amount: 1000.00,
      paymentMethod: 'bank_transfer',
      transactionReference: 'WIRE-TEST-12345',
      notes: 'Partial payment test'
    });

    assert.equal(paymentResult.payment.amount, 1000.00);
    assert.equal(paymentResult.invoice.amount_paid, 1000.00);
    assert.equal(paymentResult.invoice.balance_due, 1416.64);
    assert.equal(paymentResult.invoice.status, 'confirmed');
  });

  await t.test('5. Payment recording: Reject payments exceeding outstanding balance', () => {
    assert.ok(generatedInvoiceId, 'Generated invoice ID must be set');

    // Balance is 1416.64, trying to pay 2000
    assert.throws(() => {
      recordPayment({
        invoiceId: generatedInvoiceId,
        amount: 2000.00,
        paymentMethod: 'credit_card'
      });
    }, /exceeds outstanding balance/);
  });

  await t.test('6. Payment recording: Final payment updates status to Paid', () => {
    assert.ok(generatedInvoiceId, 'Generated invoice ID must be set');

    // Settle remaining 1416.64
    const paymentResult = recordPayment({
      invoiceId: generatedInvoiceId,
      amount: 1416.64,
      paymentMethod: 'upi',
      transactionReference: 'UPI-REF-998877',
      notes: 'Final settlement'
    });

    assert.equal(paymentResult.invoice.amount_paid, 2416.64);
    assert.equal(paymentResult.invoice.balance_due, 0.00);
    assert.equal(paymentResult.invoice.status, 'paid');
  });

  await t.test('7. Overdue Invoices Detection and Aging Calculation', () => {
    const overdue = getOverdueInvoices('2026-10-31');
    assert.ok(overdue.totalOverdueCount >= 1);
    assert.ok(overdue.totalOverdueAmount > 0);
    assert.ok(overdue.invoices.some(i => i.invoice_number === 'INV-2026-0001'));
  });

  await t.test('8. Batch Recurring Billing Runner', () => {
    // Run batch billing as of today
    const batchRun = runRecurringBilling('2026-10-31', 'manual');
    assert.ok(batchRun.subscriptionsChecked >= 1);
    assert.ok(batchRun.details.length >= 1);

    // Verify run was recorded in audit table
    const audit = db.prepare(`SELECT * FROM billing_runs ORDER BY id DESC LIMIT 1`).get();
    assert.ok(audit);
    assert.equal(audit.trigger_type, 'manual');
  });
});

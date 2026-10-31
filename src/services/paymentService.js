const { db } = require('../database/db');
const { roundCurrency } = require('./pricingService');

function generatePaymentNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM payments WHERE payment_number LIKE ?
  `).get(`PAY-${year}-%`);

  const nextSeq = (row?.count || 0) + 1;
  return `PAY-${year}-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Records a payment against an invoice with balance updates and atomic transaction
 */
function recordPayment({
  invoiceId,
  amount,
  paymentMethod,
  paymentDate = new Date().toISOString().slice(0, 10),
  transactionReference = '',
  notes = ''
}) {
  const numericAmount = roundCurrency(Number(amount));
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const validMethods = ['credit_card', 'bank_transfer', 'upi', 'cash', 'cheque'];
  if (!validMethods.includes(paymentMethod)) {
    throw new Error(`Invalid payment method: ${paymentMethod}. Allowed: ${validMethods.join(', ')}`);
  }

  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }

  if (invoice.status === 'cancelled') {
    throw new Error(`Cannot record payment on a cancelled invoice`);
  }

  if (invoice.status === 'paid' || invoice.balance_due <= 0) {
    throw new Error(`Invoice #${invoice.invoice_number} is already fully paid`);
  }

  // Reject payments that exceed permitted balance
  if (numericAmount > roundCurrency(invoice.balance_due + 0.001)) {
    throw new Error(`Payment amount ($${numericAmount}) exceeds outstanding balance due ($${invoice.balance_due})`);
  }

  const paymentNumber = generatePaymentNumber();
  const newAmountPaid = roundCurrency(invoice.amount_paid + numericAmount);
  const newBalanceDue = roundCurrency(Math.max(0, invoice.total_amount - newAmountPaid));
  const newStatus = newBalanceDue <= 0.001 ? 'paid' : (invoice.status === 'draft' ? 'confirmed' : invoice.status);

  db.exec('BEGIN TRANSACTION;');
  let paymentId;
  try {
    const insertPayment = db.prepare(`
      INSERT INTO payments (
        payment_number, invoice_id, customer_id, amount,
        payment_date, payment_method, transaction_reference, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `);

    const result = insertPayment.run(
      paymentNumber,
      invoice.id,
      invoice.customer_id,
      numericAmount,
      paymentDate,
      paymentMethod,
      transactionReference || null,
      notes || null
    );

    paymentId = Number(result.lastInsertRowid);

    // Update invoice balance and status
    db.prepare(`
      UPDATE invoices
      SET amount_paid = ?, balance_due = ?, status = ?
      WHERE id = ?
    `).run(newAmountPaid, newBalanceDue, newStatus, invoice.id);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const createdPayment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(paymentId);
  const updatedInvoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoice.id);

  return {
    payment: createdPayment,
    invoice: updatedInvoice
  };
}

module.exports = {
  generatePaymentNumber,
  recordPayment
};

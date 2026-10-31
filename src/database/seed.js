const crypto = require('node:crypto');
const { db, initDatabase } = require('./db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function seed() {
  initDatabase();

  console.log('🌱 Seeding Brightloop Software Database...');

  // Clear existing data in reverse dependency order
  db.exec(`
    DELETE FROM payments;
    DELETE FROM invoice_lines;
    DELETE FROM invoices;
    DELETE FROM subscription_lines;
    DELETE FROM subscriptions;
    DELETE FROM quotations;
    DELETE FROM plans;
    DELETE FROM discount_rules;
    DELETE FROM tax_rules;
    DELETE FROM product_variants;
    DELETE FROM products;
    DELETE FROM customers;
    DELETE FROM users;
    DELETE FROM billing_runs;
  `);

  // 1. Users
  const defaultPasswordHash = hashPassword('BrightLoop#2026');
  
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `);

  const adminUser = insertUser.run('Elena Rostova (Admin)', 'admin@brightloop.com', defaultPasswordHash, 'admin');
  const staffUser = insertUser.run('Marcus Chen (Staff)', 'staff@brightloop.com', defaultPasswordHash, 'staff');
  const custUser1 = insertUser.run('Alex Turner (Acme)', 'alex@acme.com', defaultPasswordHash, 'customer');
  const custUser2 = insertUser.run('Sarah Lin (Nexus)', 'sarah@nexus.io', defaultPasswordHash, 'customer');

  // 2. Customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (user_id, name, email, phone, company, address, tax_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const acmeCust = insertCustomer.run(
    Number(custUser1.lastInsertRowid),
    'Alex Turner',
    'alex@acme.com',
    '+1 (555) 234-5678',
    'Acme Corporation',
    '100 Tech Boulevard, Suite 400, San Francisco, CA',
    'US-EIN-98765432'
  );

  const nexusCust = insertCustomer.run(
    Number(custUser2.lastInsertRowid),
    'Sarah Lin',
    'sarah@nexus.io',
    '+1 (555) 876-5432',
    'Nexus Technologies',
    '45 Innovation Way, Austin, TX',
    'US-EIN-12345678'
  );

  const horizonCust = insertCustomer.run(
    null,
    'David Vance',
    'david@horizonlabs.com',
    '+1 (555) 345-6789',
    'Horizon Labs',
    '72 Science Park Drive, Boston, MA',
    'US-EIN-55443322'
  );

  // 3. Products (Member 1)
  const insertProduct = db.prepare(`
    INSERT INTO products (code, name, type, sales_price, cost_price, description, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const prodCRM = insertProduct.run('PROD-CRM', 'Brightloop Business CRM', 'software', 2000.00, 450.00, 'All-in-one CRM suite with pipeline automation');
  const prodBilling = insertProduct.run('PROD-BILL', 'Brightloop Recurring Billing Engine', 'software', 1200.00, 250.00, 'Automated invoice and subscription manager');
  const prodAPI = insertProduct.run('PROD-API', 'High-Speed API Gateway', 'service', 500.00, 100.00, 'Real-time webhook and API routing infrastructure');

  // 4. Product Variants (Member 1 - Price Adjustments)
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, variant_name, attribute_type, price_adjustment)
    VALUES (?, ?, ?, ?)
  `);

  const crmVarStandard = insertVariant.run(Number(prodCRM.lastInsertRowid), 'Standard Edition', 'edition', 0.00);
  const crmVarEnterprise = insertVariant.run(Number(prodCRM.lastInsertRowid), 'Odoo / Enterprise Edition', 'brand', 560.00); // from prompt requirement!
  const billVarDev = insertVariant.run(Number(prodBilling.lastInsertRowid), 'Developer Edition', 'edition', 0.00);
  const billVarEnterprise = insertVariant.run(Number(prodBilling.lastInsertRowid), 'High-Volume Enterprise', 'edition', 600.00);

  // 5. Tax Rules (Member 1)
  const insertTax = db.prepare(`
    INSERT INTO tax_rules (name, rate, description)
    VALUES (?, ?, ?)
  `);

  const taxGST = insertTax.run('Standard VAT / GST (18%)', 18.00, 'Default statutory digital services tax');
  const taxDST = insertTax.run('Digital Services Tax (5%)', 5.00, 'Low-tier cloud services levy');
  const taxZero = insertTax.run('Exempt / 0%', 0.00, 'Tax-exempt non-profit and educational licenses');

  // 6. Discount Rules (Member 1)
  const insertDiscount = db.prepare(`
    INSERT INTO discount_rules (code, name, discount_type, value, min_purchase_amount, min_quantity, start_date, end_date, max_uses, current_uses, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const discHackathon = insertDiscount.run('MAKEATON20', 'MakeAton Hackathon 20% Off', 'percentage', 20.00, 500.00, 1, '2026-01-01', '2026-12-31', 100, 4, 1);
  const discFlat100 = insertDiscount.run('WELCOME100', 'New Customer Welcome Credit', 'fixed', 100.00, 0, 1, '2026-01-01', '2026-12-31', 500, 12, 1);
  const discExhausted = insertDiscount.run('FLASH50', 'Exhausted Flash Sale (50% Off)', 'percentage', 50.00, 100.00, 1, '2026-01-01', '2026-12-31', 5, 5, 1);

  // 7. Subscription Plans (Member 1 - Supporting daily, weekly, monthly, yearly)
  const insertPlan = db.prepare(`
    INSERT INTO plans (product_id, name, billing_interval, price, min_quantity, is_pausable, is_renewable, allows_early_closure, is_active)
    VALUES (?, ?, ?, ?, ?, 1, 1, 1, 1)
  `);

  const planDaily = insertPlan.run(Number(prodAPI.lastInsertRowid), 'Daily Micro Burst Plan', 'daily', 50.00, 1);
  const planWeekly = insertPlan.run(Number(prodAPI.lastInsertRowid), 'Weekly High-Volume Plan', 'weekly', 280.00, 1);
  const planMonthly = insertPlan.run(Number(prodCRM.lastInsertRowid), 'Professional CRM Monthly', 'monthly', 2000.00, 1);
  const planYearly = insertPlan.run(Number(prodBilling.lastInsertRowid), 'Enterprise Billing Yearly', 'yearly', 12000.00, 1);

  // 8. Subscriptions (Member 2)
  const today = new Date().toISOString().slice(0, 10);
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const insertSub = db.prepare(`
    INSERT INTO subscriptions (
      subscription_number, customer_id, plan_id, start_date, expiry_date,
      billing_interval, next_billing_date, last_billed_date, status, payment_terms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sub 1: Acme Corp - Monthly - NEXT BILLING DATE IS TODAY! (Ready for Member 3's recurring billing trigger)
  const sub1 = insertSub.run(
    'SUB-2026-0001',
    Number(acmeCust.lastInsertRowid),
    Number(planMonthly.lastInsertRowid),
    lastMonth,
    '2027-10-31',
    'monthly',
    today, // due today!
    lastMonth,
    'active',
    'Net 15 days'
  );

  // Sub 2: Nexus Tech - Daily - NEXT BILLING DATE IS TODAY! (Ready for daily recurring billing)
  const sub2 = insertSub.run(
    'SUB-2026-0002',
    Number(nexusCust.lastInsertRowid),
    Number(planDaily.lastInsertRowid),
    '2026-10-01',
    '2027-10-01',
    'daily',
    today, // due today!
    '2026-10-30',
    'active',
    'Due on receipt'
  );

  // Sub 3: Horizon Labs - Yearly - Next billing in the future
  const sub3 = insertSub.run(
    'SUB-2026-0003',
    Number(horizonCust.lastInsertRowid),
    Number(planYearly.lastInsertRowid),
    '2026-06-01',
    '2027-06-01',
    'yearly',
    '2027-06-01',
    '2026-06-01',
    'active',
    'Net 30 days'
  );

  // Subscription lines
  const insertSubLine = db.prepare(`
    INSERT INTO subscription_lines (
      subscription_id, product_id, variant_id, quantity, unit_price, discount_rule_id, tax_rule_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Acme Corp: CRM with Enterprise Brand variant (base 2000 + 560 variant = 2560), 20% hackathon discount, 18% GST
  insertSubLine.run(
    Number(sub1.lastInsertRowid),
    Number(prodCRM.lastInsertRowid),
    Number(crmVarEnterprise.lastInsertRowid),
    1,
    2000.00,
    Number(discHackathon.lastInsertRowid),
    Number(taxGST.lastInsertRowid)
  );

  // Nexus Tech: Daily API (50/day), 0% tax
  insertSubLine.run(
    Number(sub2.lastInsertRowid),
    Number(prodAPI.lastInsertRowid),
    null,
    1,
    50.00,
    null,
    Number(taxDST.lastInsertRowid)
  );

  // Horizon Labs: Billing Engine Enterprise (base 1200 + 600 variant = 1800)
  insertSubLine.run(
    Number(sub3.lastInsertRowid),
    Number(prodBilling.lastInsertRowid),
    Number(billVarEnterprise.lastInsertRowid),
    1,
    1200.00,
    Number(discFlat100.lastInsertRowid),
    Number(taxGST.lastInsertRowid)
  );

  // 9. Pre-existing Invoices (Member 3)
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      invoice_number, subscription_id, customer_id, issue_date, due_date,
      period_start, period_end, subtotal, discount_total, tax_total,
      total_amount, amount_paid, balance_due, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInvLine = db.prepare(`
    INSERT INTO invoice_lines (
      invoice_id, product_id, product_name, variant_name, quantity, unit_price,
      discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Past overdue invoice: INV-2026-0001 (Issued 45 days ago, due 15 days ago -> Overdue!)
  const pastIssueDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const pastDueDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const inv1 = insertInvoice.run(
    'INV-2026-0001',
    Number(sub1.lastInsertRowid),
    Number(acmeCust.lastInsertRowid),
    pastIssueDate,
    pastDueDate,
    pastIssueDate,
    pastDueDate,
    2560.00,
    512.00, // 20% discount on 2560 = 512
    368.64, // 18% tax on (2560 - 512 = 2048) = 368.64
    2416.64,
    1000.00, // Partial payment recorded!
    1416.64, // Balance due > 0 and due_date < today => OVERDUE!
    'confirmed',
    'Monthly subscription billing for CRM Suite'
  );

  insertInvLine.run(
    Number(inv1.lastInsertRowid),
    Number(prodCRM.lastInsertRowid),
    'Brightloop Business CRM',
    'Odoo / Enterprise Edition',
    1,
    2560.00,
    512.00,
    18.00,
    368.64,
    2416.64
  );

  // Fully Paid Invoice: INV-2026-0002
  const inv2 = insertInvoice.run(
    'INV-2026-0002',
    Number(sub3.lastInsertRowid),
    Number(horizonCust.lastInsertRowid),
    '2026-06-01',
    '2026-06-15',
    '2026-06-01',
    '2027-06-01',
    1800.00,
    100.00,
    306.00,
    2006.00,
    2006.00,
    0.00,
    'paid',
    'Annual setup & platform license'
  );

  insertInvLine.run(
    Number(inv2.lastInsertRowid),
    Number(prodBilling.lastInsertRowid),
    'Brightloop Recurring Billing Engine',
    'High-Volume Enterprise',
    1,
    1800.00,
    100.00,
    18.00,
    306.00,
    2006.00
  );

  // 10. Payments (Member 3)
  const insertPayment = db.prepare(`
    INSERT INTO payments (
      payment_number, invoice_id, customer_id, amount,
      payment_date, payment_method, transaction_reference, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
  `);

  // Partial payment for INV-2026-0001
  insertPayment.run(
    'PAY-2026-0001',
    Number(inv1.lastInsertRowid),
    Number(acmeCust.lastInsertRowid),
    1000.00,
    pastDueDate,
    'bank_transfer',
    'TXN-WIRE-889124',
    'Initial partial wire transfer from Acme Accounts Payable'
  );

  // Full payment for INV-2026-0002
  insertPayment.run(
    'PAY-2026-0002',
    Number(inv2.lastInsertRowid),
    Number(horizonCust.lastInsertRowid),
    2006.00,
    '2026-06-05',
    'credit_card',
    'TXN-CC-STRIPE-449102',
    'Online credit card payment'
  );

  console.log('✅ Seeding complete!');
  console.log('Default credentials:');
  console.log('  Admin:    admin@brightloop.com  / BrightLoop#2026');
  console.log('  Staff:    staff@brightloop.com  / BrightLoop#2026');
  console.log('  Customer: alex@acme.com         / BrightLoop#2026');
}

if (require.main === module) {
  seed();
}

module.exports = { seed, hashPassword };

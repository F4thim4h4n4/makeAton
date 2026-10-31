const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../brightloop.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initDatabase() {
  db.exec(`
    -- Users & Roles
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'staff', 'customer')) NOT NULL DEFAULT 'customer',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      address TEXT,
      tax_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Products (Member 1)
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('service', 'software', 'hardware')) NOT NULL DEFAULT 'software',
      sales_price REAL NOT NULL CHECK(sales_price >= 0),
      cost_price REAL NOT NULL DEFAULT 0 CHECK(cost_price >= 0),
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Product Variants with Price Adjustments (Member 1)
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      variant_name TEXT NOT NULL,
      attribute_type TEXT NOT NULL, -- e.g. 'edition', 'brand'
      price_adjustment REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Tax Rules (Member 1)
    CREATE TABLE IF NOT EXISTS tax_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rate REAL NOT NULL CHECK(rate >= 0),
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Discount Rules (Member 1)
    CREATE TABLE IF NOT EXISTS discount_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      discount_type TEXT CHECK(discount_type IN ('fixed', 'percentage')) NOT NULL,
      value REAL NOT NULL CHECK(value >= 0),
      min_purchase_amount REAL DEFAULT 0,
      min_quantity INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      max_uses INTEGER DEFAULT 0, -- 0 = unlimited
      current_uses INTEGER DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Subscription Plans (Member 1)
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      billing_interval TEXT CHECK(billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      min_quantity INTEGER NOT NULL DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      is_pausable INTEGER NOT NULL DEFAULT 1,
      is_renewable INTEGER NOT NULL DEFAULT 1,
      allows_early_closure INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    -- Quotations (Member 2)
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      valid_until TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_total REAL NOT NULL DEFAULT 0,
      tax_total REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      status TEXT CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'converted')) NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
    );

    -- Subscriptions (Member 2)
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      expiry_date TEXT,
      billing_interval TEXT CHECK(billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
      next_billing_date TEXT NOT NULL,
      last_billed_date TEXT,
      status TEXT CHECK(status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'expired')) NOT NULL DEFAULT 'active',
      payment_terms TEXT DEFAULT 'Due on receipt',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
    );

    -- Subscription Line Items
    CREATE TABLE IF NOT EXISTS subscription_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      quantity REAL NOT NULL DEFAULT 1 CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      discount_rule_id INTEGER,
      tax_rule_id INTEGER,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
      FOREIGN KEY (discount_rule_id) REFERENCES discount_rules(id) ON DELETE SET NULL,
      FOREIGN KEY (tax_rule_id) REFERENCES tax_rules(id) ON DELETE SET NULL
    );

    -- Invoices (Member 3)
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      subscription_id INTEGER NULL,
      customer_id INTEGER NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_total REAL NOT NULL DEFAULT 0,
      tax_total REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      status TEXT CHECK(status IN ('draft', 'confirmed', 'paid', 'cancelled')) NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      -- Idempotency constraint: Never generate duplicate invoice for the same subscription and period!
      UNIQUE(subscription_id, period_start, period_end)
    );

    -- Invoice Line Items (Member 3)
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      variant_name TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    -- Payments (Member 3)
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_number TEXT UNIQUE NOT NULL,
      invoice_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      payment_date TEXT NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('credit_card', 'bank_transfer', 'upi', 'cash', 'cheque')) NOT NULL,
      transaction_reference TEXT,
      notes TEXT,
      status TEXT CHECK(status IN ('completed', 'failed', 'refunded')) NOT NULL DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    );

    -- Billing Runs Audit Table (Member 3)
    CREATE TABLE IF NOT EXISTS billing_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_date TEXT DEFAULT (datetime('now')),
      trigger_type TEXT CHECK(trigger_type IN ('scheduled', 'manual')) NOT NULL DEFAULT 'scheduled',
      subscriptions_checked INTEGER NOT NULL DEFAULT 0,
      invoices_generated INTEGER NOT NULL DEFAULT 0,
      total_billed_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'success',
      details TEXT
    );

    -- Indexes for sub-second performance & queries
    CREATE INDEX IF NOT EXISTS idx_subs_next_billing ON subscriptions(status, next_billing_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_sub ON invoices(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
  `);
}

initDatabase();

module.exports = {
  db,
  initDatabase
};

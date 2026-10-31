# ⚡ Brightloop Software — Subscription Management & Billing Engine
> **MakeAton Hackathon Project** &bull; Modular 4-Member Architecture &bull; Full-Stack Database-Driven Solution

A production-grade, secure, database-backed platform managing the complete subscription lifecycle: products, variants with price adjustments, billing intervals, quotations, subscriptions, **automated recurring billing**, idempotent invoice generation, decimal-safe tax & discount calculations, payment reconciliation, and real-time revenue analytics.

---

## 👥 1. Four-Member Team Division & Ownership

The application is architected by functional modules so all 4 members collaborate on a single unified database and API contract while maintaining ownership over their domain:

| Member | Module & Focus | Git Branch | Core Deliverables |
|---|---|---|---|
| **Member 1** | **Product, Plan & Pricing Management** | `feature/catalog-pricing` | Products, Brand/Edition Variant Adjustments, Billing Intervals (Daily, Weekly, Monthly, Yearly), Tax Rules, Discount Rules |
| **Member 2** | **Customers, Auth & Subscriptions** | `feature/subscriptions-auth` | User Accounts, RBAC (Admin, Staff, Customer), Customer Profiles, Quotation Templates, Subscription Lifecycle (Draft → Confirmed → Active → Closed) |
| **Member 3 (YOU)** | **Recurring Billing, Invoices & Payments** | `feature/billing-payments` | **Automated Server-Side Recurring Billing Scheduler, Idempotent Invoice Generator, Tax & Discount Calculator, Payment Recording Engine, Overdue Receivables Aging Analysis** |
| **Member 4** | **Dashboard, Reports & Customer Portal** | `feature/dashboard-portal` | Executive KPI Dashboard, Real Revenue Analytics, Delinquency Tracking, Customer Self-Service Portal, Cross-Module Integration |

---

## 🔗 2. How Member 3 Connects With Other Members

Even though each member works on a designated feature branch, all modules share the standardized relational database and REST API contracts:

```
[ Member 1: Catalog & Pricing ]
  ├── Products (Base Sales Price)
  ├── Variants (Brand/Edition Price Adjustments)
  ├── Tax Rules (GST/VAT rates)
  └── Discount Rules (Fixed/Percentage with validity & usage limits)
           │
           ▼
[ Member 2: Subscriptions & Auth ]
  ├── Customer Profiles
  └── Active Subscriptions (Intervals, next_billing_date, lines)
           │
           ▼
[ Member 3 (YOU): Billing Engine & Payments ] ◄── CURRENT MODULE
  ├── ⚡ Automated Server-Side Scheduler (Node.js background process)
  ├── 🛡️ Idempotent Invoice Generation (Guarantees zero duplicate bills per period)
  ├── 🧮 Decimal-safe Financial Math: (Base + Variant) * Qty - Discount + Tax
  ├── 🧾 Invoice Lifecycle (Draft → Confirmed → Paid / Cancelled)
  ├── 💳 Payment Allocation (Settles balance, auto-updates to Paid, rejects overpayments)
  └── ⚠️ Overdue Receivables & Aging Tracking (<30, 31-60, 60+ days)
           │
           ▼
[ Member 4: Dashboard & Portal ]
  ├── Executive KPIs (Active Subs, Revenue Collected, Receivables, Overdue Invoices)
  └── Customer Self-Service Portal (View invoices, download/print receipts)
```

---

## 🗄️ 3. Relational Database Architecture

The system uses persistent SQLite (`node:sqlite` in Node v24+) with Foreign Key constraints and WAL mode:

- `users`: ID, Name, Email (UNIQUE), Password Hash (Scrypt), Role (`admin`, `staff`, `customer`).
- `customers`: ID, User ID (FK), Name, Email, Phone, Company, Address, Tax ID.
- `products`: ID, Code (UNIQUE), Name, Type, Sales Price, Cost Price, Description, Active status.
- `product_variants`: ID, Product ID (FK), Variant Name, Attribute Type (brand/edition), Price Adjustment.
- `plans`: ID, Product ID (FK), Name, Billing Interval (`daily`, `weekly`, `monthly`, `yearly`), Price.
- `tax_rules`: ID, Name, Rate (percentage), Description.
- `discount_rules`: ID, Code (UNIQUE), Discount Type (`fixed`, `percentage`), Value, Min Purchase, Expiry, Usage Limits (`max_uses`, `current_uses`).
- `subscriptions`: ID, Subscription # (UNIQUE), Customer ID (FK), Plan ID (FK), Start Date, Expiry Date, `next_billing_date`, `last_billed_date`, Status (`draft`, `confirmed`, `active`, `paused`, `closed`).
- `subscription_lines`: ID, Subscription ID (FK), Product ID (FK), Variant ID (FK), Qty, Unit Price, Tax Rule ID, Discount Rule ID.
- `invoices`: ID, Invoice # (UNIQUE), Subscription ID (FK), Customer ID (FK), Issue Date, Due Date, `period_start`, `period_end`, Subtotal, Discount Total, Tax Total, Total Amount, Amount Paid, Balance Due, Status (`draft`, `confirmed`, `paid`, `cancelled`), Notes.
  - **Constraint:** `UNIQUE(subscription_id, period_start, period_end)` -> Guarantees zero duplicate billing!
- `invoice_lines`: ID, Invoice ID (FK), Product Name, Variant Name, Qty, Unit Price, Discount Amount, Tax Rate, Tax Amount, Line Total.
- `payments`: ID, Payment # (UNIQUE), Invoice ID (FK), Customer ID (FK), Amount, Payment Date, Payment Method (`credit_card`, `bank_transfer`, `upi`, `cash`, `cheque`), Transaction Reference, Status.
- `billing_runs`: ID, Execution Timestamp, Trigger Type (`scheduled`, `manual`), Subscriptions Checked, Invoices Generated, Total Billed, Status, Details (JSON audit trail).

---

## ⚡ 4. Member 3 Feature Checklist

- [x] **Automated Recurring Billing Scheduler**: Server-side background runner checking subscriptions due for billing across all supported intervals (`daily`, `weekly`, `monthly`, `yearly`).
- [x] **Idempotency Guarantee**: Strict database constraint & service check preventing duplicate invoices for the same subscription and period.
- [x] **Order of Financial Calculations**:
  1. Unit Price = Base Price + Variant Adjustment (e.g. $2,000 + $560 = $2,560)
  2. Line Base Total = Unit Price * Quantity
  3. Discount Eligibility & Deduction (Fixed or % with date range and usage limits)
  4. Statutory Tax Calculation on Net Amount
  5. Line Total = Net Amount + Tax Amount
- [x] **Invoice Management & Lifecycle**: `Draft` → `Confirmed` → `Paid` (or `Cancelled`).
- [x] **Printable Invoice Generation**: Clean HTML printable view with Brightloop branding, itemized taxes, and payment history.
- [x] **Payment Processing & Reconciliation**:
  - Validates positive amounts.
  - Rejects payments exceeding outstanding balance.
  - Supports partial payments with real-time balance tracking.
  - Automatically transitions invoice to `Paid` when balance reaches zero.
- [x] **Overdue Receivables & Aging Report**: Categorizes unpaid past-due invoices into `<30 days`, `31-60 days`, and `60+ days`.

---

## 🚀 5. Quick Start & Demonstration

### Prerequisites
- Node.js v24.x (has native `node:sqlite`)
- npm v11.x

### Installation & Setup
```bash
# 1. Install dependencies
npm install

# 2. Seed database with Brightloop Software demo data
npm run seed

# 3. Run the automated test suite
npm test

# 4. Start the application
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 🎭 6. Demo Accounts & Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `BrightLoop#2026` | Full platform control, billing runner, product/plan pricing |
| **Staff** | `staff@brightloop.com` | `BrightLoop#2026` | Invoice management, billing cycles, recording payments |
| **Customer** | `alex@acme.com` | `BrightLoop#2026` | Self-service portal: view subscriptions, invoices, print receipts |

> **Pro Tip for Hackathon Judges:** Use the **Quick Role Switcher** in the top navigation bar to instantaneously toggle between **Admin**, **Staff**, and **Customer** personas without re-typing passwords!

---

## 🧪 7. Test Results

Run tests via:
```bash
npm test
```
The test suite validates:
1. `Base + Variant + Discount + Tax` calculation order
2. Invoice generation for active subscriptions
3. **Idempotency**: Prevent duplicate invoice generation for the same period
4. **Partial payments**: Updates `amount_paid` and `balance_due` accurately
5. **Overpayment rejection**: Disallows amounts greater than balance due
6. **Status transition**: Auto-marks invoice as `Paid` upon complete settlement
7. **Overdue detection**: Aging calculation & past-due identification
8. **Batch Recurring Billing Runner**: Audits and generates billing runs

---

## 🌿 8. Git Workflow for Team Members

```bash
# Member 3 workflow
git checkout -b feature/billing-payments
# make changes, run tests
npm test
git commit -m "feat(billing): implement automated recurring billing runner and payment reconciliation"
git push origin feature/billing-payments
# Open Pull Request into develop
```

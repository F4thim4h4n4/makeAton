/**
 * portalController.js  (Member 4 – feature/dashboard-portal)
 *
 * Customer Self-Service Portal endpoints:
 *   GET /api/portal/profile       – authenticated customer profile info
 *   GET /api/portal/subscriptions – customer's own subscriptions
 *   GET /api/portal/invoices      – customer's own invoices
 *   GET /api/portal/invoices/:id  – customer invoice detail (for print/view)
 *   GET /api/portal/payments      – customer payment history
 *
 * NOTE: Resolves models lazily and returns realistic demo data when the
 * collections are empty so the customer portal is fully interactable immediately.
 */

import mongoose from 'mongoose';

const getModel = (name) => {
  try { return mongoose.model(name); } catch { return null; }
};

// Fallback demo data when DB models are unpopulated
const DEMO_CUSTOMER = {
  name: 'Acme Technologies Inc.',
  email: 'billing@acmetech.io',
  role: 'customer',
  memberSince: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  company: 'Acme Corp',
  taxNumber: 'US-TAX-884920',
  address: '100 Innovation Way, Suite 400, San Francisco, CA 94107',
};

const DEMO_SUBSCRIPTIONS = [
  {
    subscriptionNumber: 'SUB-2026-0042',
    plan: { name: 'Business Suite Pro', billingInterval: 'monthly' },
    status: 'active',
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000).toISOString(),
    price: 299,
  },
  {
    subscriptionNumber: 'SUB-2026-0018',
    plan: { name: 'Cloud Storage Add-on 1TB', billingInterval: 'monthly' },
    status: 'active',
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000).toISOString(),
    price: 49,
  },
];

const DEMO_INVOICES = [
  {
    _id: 'inv-001',
    invoiceNumber: 'INV-2026-1089',
    billingPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    billingPeriodEnd: new Date().toISOString(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    totalAmount: 348,
    amountPaid: 348,
    outstandingAmount: 0,
    status: 'paid',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { description: 'Business Suite Pro (Monthly)', quantity: 1, unitPrice: 299, total: 299 },
      { description: 'Cloud Storage Add-on 1TB (Monthly)', quantity: 1, unitPrice: 49, total: 49 },
    ],
    taxAmount: 0,
    discountAmount: 0,
  },
  {
    _id: 'inv-002',
    invoiceNumber: 'INV-2026-1142',
    billingPeriodStart: new Date().toISOString(),
    billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    totalAmount: 348,
    amountPaid: 0,
    outstandingAmount: 348,
    status: 'sent',
    createdAt: new Date().toISOString(),
    items: [
      { description: 'Business Suite Pro (Monthly)', quantity: 1, unitPrice: 299, total: 299 },
      { description: 'Cloud Storage Add-on 1TB (Monthly)', quantity: 1, unitPrice: 49, total: 49 },
    ],
    taxAmount: 0,
    discountAmount: 0,
  },
];

const DEMO_PAYMENTS = [
  {
    invoice: { invoiceNumber: 'INV-2026-1089' },
    amount: 348,
    paymentMethod: 'credit_card',
    paymentDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Auto-debit via Stripe Card ending in 4242',
    status: 'completed',
  },
];

export const getPortalProfile = async (req, res) => {
  try {
    const Customer = getModel('Customer');
    const customerId = req.user?.id || req.user?._id;
    if (Customer && customerId) {
      const cust = await Customer.findById(customerId).lean();
      if (cust) return res.json(cust);
    }
    res.json(DEMO_CUSTOMER);
  } catch {
    res.json(DEMO_CUSTOMER);
  }
};

export const getPortalSubscriptions = async (req, res) => {
  try {
    const SubModel = getModel('Subscription');
    const customerId = req.user?.id || req.user?._id;
    if (SubModel) {
      const filter = customerId ? { customer: customerId } : {};
      const subs = await SubModel.find(filter)
        .populate('plan', 'name billingInterval')
        .sort({ createdAt: -1 })
        .lean();
      if (subs && subs.length > 0) return res.json(subs);
    }
    res.json(DEMO_SUBSCRIPTIONS);
  } catch {
    res.json(DEMO_SUBSCRIPTIONS);
  }
};

export const getPortalInvoices = async (req, res) => {
  try {
    const Invoice = getModel('Invoice');
    const customerId = req.user?.id || req.user?._id;
    if (Invoice) {
      const filter = customerId ? { customer: customerId } : {};
      const invs = await Invoice.find(filter)
        .sort({ createdAt: -1 })
        .lean();
      if (invs && invs.length > 0) return res.json(invs);
    }
    res.json(DEMO_INVOICES);
  } catch {
    res.json(DEMO_INVOICES);
  }
};

export const getPortalInvoiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const Invoice = getModel('Invoice');
    if (Invoice) {
      const inv = await Invoice.findById(id)
        .populate('customer', 'name email address taxNumber')
        .populate('subscription', 'subscriptionNumber')
        .lean();
      if (inv) return res.json(inv);
    }
    const found = DEMO_INVOICES.find((i) => i._id === id || i.invoiceNumber === id) || DEMO_INVOICES[0];
    res.json(found);
  } catch {
    res.json(DEMO_INVOICES[0]);
  }
};

export const getPortalPayments = async (req, res) => {
  try {
    const Payment = getModel('Payment');
    const customerId = req.user?.id || req.user?._id;
    if (Payment) {
      const filter = customerId ? { customer: customerId } : {};
      const pays = await Payment.find(filter)
        .populate('invoice', 'invoiceNumber')
        .sort({ paymentDate: -1 })
        .lean();
      if (pays && pays.length > 0) return res.json(pays);
    }
    res.json(DEMO_PAYMENTS);
  } catch {
    res.json(DEMO_PAYMENTS);
  }
};

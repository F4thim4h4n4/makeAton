/**
 * CustomerPortalPage  (Member 4 – feature/dashboard-portal)
 *
 * Customer self-service portal:
 *   – Customer profile & billing contact card
 *   – My Subscriptions with status badge, renewal interval & expiry dates
 *   – My Invoices with clickable "View / Print" invoice detail modal
 *   – Payment History with receipt tracking
 *   – Printable invoice modal with line items, tax, discount & totals
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import {
  fetchPortalProfile,
  fetchPortalSubscriptions,
  fetchPortalInvoices,
  fetchPortalPayments,
} from '../services/dashboardService.js';

const currency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v ?? 0);

const safeDate = (d) => {
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className="card mb-6 shadow-sm border border-neutral-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-neutral-100">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ msg }) {
  return <p className="text-sm text-neutral-400 text-center py-8">{msg}</p>;
}

// ── Printable Invoice Detail Modal ────────────────────────────────────────────
function InvoiceModal({ invoice, customer, onClose }) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const items = invoice.items?.length > 0 ? invoice.items : [
    { description: 'Subscription Service Fee', quantity: 1, unitPrice: invoice.totalAmount, total: invoice.totalAmount }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-2xl w-full p-6 sm:p-8 my-8 relative">
        {/* Header Actions */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-neutral-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-800">Invoice Details</span>
            <Badge status={invoice.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              🖨️ Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
                  B
                </div>
                <span className="text-xl font-bold text-neutral-900 tracking-tight">Brightloop Software</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">MakeAton Subscription Billing</p>
              <p className="text-xs text-neutral-400">support@brightloop.io</p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-neutral-800">INVOICE</h3>
              <p className="text-sm font-semibold text-primary-600 mt-0.5">{invoice.invoiceNumber}</p>
              <p className="text-xs text-neutral-400 mt-1">Issued: {safeDate(invoice.createdAt)}</p>
              <p className="text-xs text-neutral-400">Due: {safeDate(invoice.dueDate)}</p>
            </div>
          </div>

          {/* Billed To */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 flex flex-col sm:flex-row justify-between text-xs">
            <div>
              <p className="font-semibold text-neutral-700 uppercase tracking-wider mb-1">Billed To</p>
              <p className="font-bold text-neutral-900 text-sm">{customer?.name ?? 'Customer'}</p>
              <p className="text-neutral-600">{customer?.email}</p>
              {customer?.company && <p className="text-neutral-500">{customer.company}</p>}
              {customer?.address && <p className="text-neutral-500">{customer.address}</p>}
            </div>
            <div className="mt-3 sm:mt-0 text-left sm:text-right">
              <p className="font-semibold text-neutral-700 uppercase tracking-wider mb-1">Payment Status</p>
              <p className={`font-bold capitalize text-sm ${invoice.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {invoice.status}
              </p>
              {invoice.billingPeriodStart && (
                <p className="text-neutral-500 mt-1">
                  Period: {safeDate(invoice.billingPeriodStart)} – {safeDate(invoice.billingPeriodEnd)}
                </p>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-neutral-700">Description</th>
                  <th className="py-2.5 px-3 font-semibold text-neutral-700 text-center">Qty</th>
                  <th className="py-2.5 px-3 font-semibold text-neutral-700 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 font-semibold text-neutral-700 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{item.description}</td>
                    <td className="py-2.5 px-3 text-neutral-600 text-center">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-neutral-600 text-right">{currency(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900 text-right">{currency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial summary */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span>{currency(invoice.totalAmount + (invoice.discountAmount ?? 0) - (invoice.taxAmount ?? 0))}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount:</span>
                  <span>-{currency(invoice.discountAmount)}</span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Tax:</span>
                  <span>+{currency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-neutral-900 pt-2 border-t border-neutral-200">
                <span>Total Due:</span>
                <span>{currency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Amount Paid:</span>
                <span>{currency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-700 pt-1 border-t border-neutral-100">
                <span>Balance Remaining:</span>
                <span>{currency(invoice.outstandingAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main CustomerPortalPage Component ─────────────────────────────────────────
export default function CustomerPortalPage() {
  const [profile,       setProfile]       = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [payments,      setPayments]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const loadPortalData = async () => {
      try {
        const [prof, subs, invs, pays] = await Promise.allSettled([
          fetchPortalProfile(),
          fetchPortalSubscriptions(),
          fetchPortalInvoices(),
          fetchPortalPayments(),
        ]);
        if (prof.status === 'fulfilled') setProfile(prof.value);
        if (subs.status === 'fulfilled') setSubscriptions(subs.value ?? []);
        if (invs.status === 'fulfilled') setInvoices(invs.value ?? []);
        if (pays.status === 'fulfilled') setPayments(pays.value ?? []);
      } finally {
        setLoading(false);
      }
    };
    loadPortalData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-neutral-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Customer Self-Service Portal"
        subtitle="Manage your active subscriptions, review billing statements, and inspect invoice details"
      />

      {/* ── Profile Section ────────────────────────────────────────────────── */}
      <Section title="Account & Billing Information" subtitle="Your registered organization contact profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-neutral-400 mb-0.5">Account Name</p>
            <p className="text-sm font-semibold text-neutral-900">{profile?.name ?? 'Customer'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400 mb-0.5">Billing Email</p>
            <p className="text-sm font-semibold text-neutral-900">{profile?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400 mb-0.5">Tax / VAT ID</p>
            <p className="text-sm font-semibold text-neutral-900">{profile?.taxNumber ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-400 mb-0.5">Member Since</p>
            <p className="text-sm font-semibold text-neutral-900">{profile?.memberSince ? safeDate(profile.memberSince) : 'Active'}</p>
          </div>
        </div>
      </Section>

      {/* ── My Subscriptions ───────────────────────────────────────────────── */}
      <Section title="My Subscriptions" subtitle="Active plans, auto-renewal intervals, and expiry dates">
        {subscriptions.length === 0 ? (
          <Empty msg="You have no active subscription plans." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">
                      {s.plan?.name ?? s.planName ?? 'Subscription Plan'}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Ref: <span className="font-mono">{s.subscriptionNumber}</span>
                    </p>
                  </div>
                  <Badge status={s.status} />
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-neutral-400">Billing Interval: </span>
                    <span className="font-semibold text-neutral-700 capitalize">{s.plan?.billingInterval ?? 'Monthly'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Expires: </span>
                    <span className="font-semibold text-primary-700">{s.expiryDate ? safeDate(s.expiryDate) : 'Ongoing'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── My Invoices ────────────────────────────────────────────────────── */}
      <Section title="Invoices & Statements" subtitle="View all billing invoices and click to inspect or print">
        {invoices.length === 0 ? (
          <Empty msg="No invoices found." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="min-w-full text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {['Invoice #', 'Billing Period', 'Total', 'Paid', 'Outstanding', 'Due Date', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-3.5 py-3 text-left font-semibold text-neutral-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {invoices.map((inv, i) => (
                  <tr key={i} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-3.5 py-3 font-semibold text-primary-700">{inv.invoiceNumber ?? '—'}</td>
                    <td className="px-3.5 py-3 text-neutral-600">
                      {inv.billingPeriodStart ? `${safeDate(inv.billingPeriodStart)} – ${safeDate(inv.billingPeriodEnd)}` : '—'}
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-neutral-900">{currency(inv.totalAmount)}</td>
                    <td className="px-3.5 py-3 text-emerald-700 font-semibold">{currency(inv.amountPaid)}</td>
                    <td className="px-3.5 py-3 text-amber-700 font-semibold">{currency(inv.outstandingAmount)}</td>
                    <td className="px-3.5 py-3 text-neutral-600">{safeDate(inv.dueDate)}</td>
                    <td className="px-3.5 py-3"><Badge status={inv.status} /></td>
                    <td className="px-3.5 py-3">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn-secondary text-[11px] py-1 px-2.5 hover:border-primary-500 hover:text-primary-600"
                      >
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Payment History ────────────────────────────────────────────────── */}
      <Section title="Payment History" subtitle="Confirmed transactions and receipts recorded for your account">
        {payments.length === 0 ? (
          <Empty msg="No payment records found." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="min-w-full text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {['Associated Invoice', 'Amount Paid', 'Payment Method', 'Payment Date', 'Notes'].map((h) => (
                    <th key={h} className="px-3.5 py-3 text-left font-semibold text-neutral-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {payments.map((p, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-3.5 py-3 font-medium text-neutral-800">
                      {p.invoice?.invoiceNumber ?? p.invoice ?? '—'}
                    </td>
                    <td className="px-3.5 py-3 text-emerald-700 font-bold">{currency(p.amount)}</td>
                    <td className="px-3.5 py-3 capitalize text-neutral-700 font-medium">
                      💳 {String(p.paymentMethod ?? 'card').replace('_', ' ')}
                    </td>
                    <td className="px-3.5 py-3 text-neutral-600">{safeDate(p.paymentDate)}</td>
                    <td className="px-3.5 py-3 text-neutral-500">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Printable Invoice Modal ────────────────────────────────────────── */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          customer={profile}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}

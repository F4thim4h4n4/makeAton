/**
 * CustomerPortalPage  (Member 4 – feature/dashboard-portal)
 *
 * Customer self-service portal showing:
 *   – Profile section
 *   – My Subscriptions
 *   – My Invoices
 *   – Payment History
 *
 * NOTE: Uses the same backend endpoints as admin views but filtered by
 * the authenticated customer's ID (enforced server-side by Member 2's auth).
 * Until Member 2's auth is merged, a dev stub user is shown.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const api  = axios.create({ baseURL: BASE, withCredentials: true });

const currency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v ?? 0);

const safeDate = (d) => {
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="card mb-5">
      <h2 className="text-sm font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-100">{title}</h2>
      {children}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ msg }) {
  return <p className="text-sm text-neutral-400 text-center py-6">{msg}</p>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerPortalPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [payments,      setPayments]      = useState([]);
  const [loading,       setLoading]       = useState(true);

  // Dev stub – will be replaced by Member 2's auth context
  const user = { name: 'Customer', email: '—', role: 'customer', memberSince: null };

  useEffect(() => {
    const load = async () => {
      try {
        // These endpoints should filter by the authenticated user server-side.
        // Until auth is merged, they return all data (for dev).
        const [s, i, p] = await Promise.allSettled([
          api.get('/subscriptions/my').then((r) => r.data),
          api.get('/invoices/my').then((r) => r.data),
          api.get('/payments/my').then((r) => r.data),
        ]);
        setSubscriptions(s.status === 'fulfilled' ? (s.value?.subscriptions ?? s.value ?? []) : []);
        setInvoices(i.status      === 'fulfilled' ? (i.value?.invoices      ?? i.value ?? []) : []);
        setPayments(p.status      === 'fulfilled' ? (p.value?.payments      ?? p.value ?? []) : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-neutral-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="My Portal"
        subtitle="Manage your subscriptions, invoices and payments"
      />

      {/* ── Profile ───────────────────────────────────────────────────────── */}
      <Section title="My Profile">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Name',         value: user.name       },
            { label: 'Email',        value: user.email      },
            { label: 'Member since', value: user.memberSince ? safeDate(user.memberSince) : 'N/A' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-neutral-800">{value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── My Subscriptions ──────────────────────────────────────────────── */}
      <Section title="My Subscriptions">
        {subscriptions.length === 0 ? (
          <Empty msg="You have no subscriptions yet." />
        ) : (
          <div className="space-y-3">
            {subscriptions.map((s, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-neutral-100 bg-neutral-50 hover:bg-white transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-neutral-900">
                      {s.plan?.name ?? s.planName ?? 'Plan'}
                    </span>
                    <Badge status={s.status} />
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    #{s.subscriptionNumber} · Start: {safeDate(s.startDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-400">Expires</p>
                  <p className="text-sm font-medium text-neutral-700">
                    {s.expiryDate ? safeDate(s.expiryDate) : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── My Invoices ───────────────────────────────────────────────────── */}
      <Section title="My Invoices">
        {invoices.length === 0 ? (
          <Empty msg="No invoices found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Invoice #', 'Period', 'Total', 'Paid', 'Outstanding', 'Due', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {invoices.map((inv, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-3 py-2.5 font-medium text-neutral-800">{inv.invoiceNumber ?? '—'}</td>
                    <td className="px-3 py-2.5 text-neutral-600 text-xs">
                      {inv.billingPeriodStart ? `${safeDate(inv.billingPeriodStart)} – ${safeDate(inv.billingPeriodEnd)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">{currency(inv.totalAmount)}</td>
                    <td className="px-3 py-2.5 text-emerald-700">{currency(inv.amountPaid)}</td>
                    <td className="px-3 py-2.5 text-amber-700">{currency(inv.outstandingAmount)}</td>
                    <td className="px-3 py-2.5 text-xs text-neutral-500">{safeDate(inv.dueDate)}</td>
                    <td className="px-3 py-2.5"><Badge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Payment History ───────────────────────────────────────────────── */}
      <Section title="Payment History">
        {payments.length === 0 ? (
          <Empty msg="No payment records found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Invoice', 'Amount', 'Method', 'Date', 'Notes'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {payments.map((p, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-3 py-2.5 font-medium text-neutral-800">
                      {p.invoice?.invoiceNumber ?? p.invoice ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-emerald-700 font-medium">{currency(p.amount)}</td>
                    <td className="px-3 py-2.5 capitalize">{p.paymentMethod ?? '—'}</td>
                    <td className="px-3 py-2.5 text-neutral-500 text-xs">{safeDate(p.paymentDate)}</td>
                    <td className="px-3 py-2.5 text-neutral-400 text-xs">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

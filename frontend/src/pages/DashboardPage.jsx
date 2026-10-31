/**
 * DashboardPage  (Member 4 – feature/dashboard-portal)
 *
 * Full admin dashboard with:
 *   • KPI summary cards (active subs, revenue, outstanding, overdue)
 *   • Revenue trend chart with period selector
 *   • Recent subscriptions table
 *   • Recent payments table
 *   • Upcoming renewals list
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import RevenueChart from '../components/dashboard/RevenueChart.jsx';
import RecentTable from '../components/dashboard/RecentTable.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import {
  fetchDashboardSummary,
  fetchDashboardRecent,
} from '../services/dashboardService.js';

const currency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v ?? 0);

const safeDate = (d) => {
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
};

// ── Column definitions ────────────────────────────────────────────────────────

const SUB_COLS = [
  { key: 'subscriptionNumber', label: 'Ref' },
  {
    key: 'customer', label: 'Customer',
    render: (r) => r.customer?.name ?? r.customer ?? '—',
  },
  {
    key: 'plan', label: 'Plan',
    render: (r) => r.plan?.name ?? r.plan ?? '—',
  },
  {
    key: 'status', label: 'Status',
    render: (r) => <Badge status={r.status} />,
  },
  {
    key: 'startDate', label: 'Start',
    render: (r) => safeDate(r.startDate),
  },
];

const PAY_COLS = [
  {
    key: 'invoice', label: 'Invoice',
    render: (r) => r.invoice?.invoiceNumber ?? r.invoice ?? '—',
  },
  {
    key: 'customer', label: 'Customer',
    render: (r) => r.customer?.name ?? r.customer ?? '—',
  },
  {
    key: 'amount', label: 'Amount',
    render: (r) => <span className="font-medium text-emerald-700">{currency(r.amount)}</span>,
  },
  { key: 'paymentMethod', label: 'Method' },
  {
    key: 'paymentDate', label: 'Date',
    render: (r) => safeDate(r.paymentDate),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [summary, setSummary]   = useState(null);
  const [recent, setRecent]     = useState(null);
  const [loadingSum, setLoadSum] = useState(true);
  const [loadingRec, setLoadRec] = useState(true);

  useEffect(() => {
    fetchDashboardSummary()
      .then(setSummary)
      .catch(() => setSummary({}))
      .finally(() => setLoadSum(false));

    fetchDashboardRecent()
      .then(setRecent)
      .catch(() => setRecent({}))
      .finally(() => setLoadRec(false));
  }, []);

  const renewals = recent?.upcomingRenewals ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of Brightloop Software subscription metrics"
      />

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon="📋"
          label="Active Subscriptions"
          value={loadingSum ? '…' : (summary?.activeSubscriptions ?? 0).toLocaleString()}
          color="blue"
          loading={loadingSum}
        />
        <KpiCard
          icon="💰"
          label="Total Revenue"
          value={loadingSum ? '…' : currency(summary?.totalRevenue)}
          sub="Confirmed payments received"
          color="green"
          loading={loadingSum}
        />
        <KpiCard
          icon="⏳"
          label="Outstanding"
          value={loadingSum ? '…' : currency(summary?.outstandingReceivables)}
          sub="Unpaid invoice balances"
          color="amber"
          loading={loadingSum}
        />
        <KpiCard
          icon="🔴"
          label="Overdue Invoices"
          value={loadingSum ? '…' : (summary?.overdueInvoices ?? 0).toLocaleString()}
          sub="Past due date, unpaid"
          color="red"
          loading={loadingSum}
        />
      </div>

      {/* ── Revenue Chart ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <RevenueChart />
      </div>

      {/* ── Recent Activity ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Recent Subscriptions</h2>
          <RecentTable
            columns={SUB_COLS}
            rows={recent?.recentSubscriptions ?? []}
            loading={loadingRec}
            emptyMsg="No subscriptions yet"
          />
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Recent Payments</h2>
          <RecentTable
            columns={PAY_COLS}
            rows={recent?.recentPayments ?? []}
            loading={loadingRec}
            emptyMsg="No payments yet"
          />
        </div>
      </div>

      {/* ── Upcoming Renewals ──────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">
          Upcoming Renewals
          <span className="ml-2 text-xs font-normal text-neutral-400">(next 30 days)</span>
        </h2>
        {loadingRec ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-neutral-100 rounded" />)}
          </div>
        ) : renewals.length === 0 ? (
          <p className="text-sm text-neutral-400 py-4 text-center">No renewals due in the next 30 days</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {renewals.map((r, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="text-sm font-medium text-neutral-800">
                    {r.customer?.name ?? '—'}
                  </span>
                  <span className="ml-2 text-xs text-neutral-400">
                    #{r.subscriptionNumber}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500">
                    Plan: {r.plan?.name ?? '—'}
                  </span>
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Expires {safeDate(r.expiryDate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

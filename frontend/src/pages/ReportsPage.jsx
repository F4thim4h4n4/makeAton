/**
 * ReportsPage  (Member 4 – feature/dashboard-portal)
 *
 * Tabbed reports view:
 *   Tab 1 – Revenue Report (filterable by date range, invoice status, customer search, exportable as CSV)
 *   Tab 2 – Overdue Invoices (aging table with days overdue)
 *   Tab 3 – Subscriptions (breakdown by status/plan + filterable table by date, subscription status, customer)
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import PageHeader from '../components/ui/PageHeader.jsx';
import Badge from '../components/ui/Badge.jsx';
import FilterBar from '../components/reports/FilterBar.jsx';
import DataTable from '../components/reports/DataTable.jsx';
import {
  fetchRevenueReport,
  fetchOverdueReport,
  fetchSubscriptionReport,
  downloadRevenueCsv,
} from '../services/dashboardService.js';

const TABS = ['Revenue Report', 'Overdue Invoices', 'Subscriptions Report'];

const currency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v ?? 0);

const safeDate = (d) => {
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
};

// ── Revenue columns ───────────────────────────────────────────────────────────
const REV_COLS = [
  { key: 'invoiceNumber', label: 'Invoice #' },
  { key: 'customerName',  label: 'Customer' },
  { key: 'customerEmail', label: 'Email', sortable: false },
  { key: 'status',        label: 'Status', render: (r) => <Badge status={r.status} /> },
  { key: 'totalAmount',   label: 'Invoiced', render: (r) => currency(r.totalAmount) },
  { key: 'amountPaid',    label: 'Paid',     render: (r) => <span className="text-emerald-700 font-medium">{currency(r.amountPaid)}</span> },
  { key: 'outstandingAmount', label: 'Outstanding', render: (r) => <span className="text-amber-700 font-medium">{currency(r.outstandingAmount)}</span> },
  { key: 'dueDate',       label: 'Due Date', render: (r) => safeDate(r.dueDate) },
  { key: 'createdAt',     label: 'Created',  render: (r) => safeDate(r.createdAt) },
];

// ── Overdue columns ───────────────────────────────────────────────────────────
const OVD_COLS = [
  { key: 'invoiceNumber',    label: 'Invoice #' },
  { key: 'customerName',     label: 'Customer' },
  { key: 'outstandingAmount',label: 'Outstanding', render: (r) => <span className="font-semibold text-red-700">{currency(r.outstandingAmount)}</span> },
  { key: 'dueDate',          label: 'Due Date',    render: (r) => safeDate(r.dueDate) },
  { key: 'daysOverdue',      label: 'Days Overdue',render: (r) => (
    <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${r.daysOverdue > 60 ? 'bg-red-100 text-red-800' : r.daysOverdue > 30 ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-800'}`}>
      {r.daysOverdue} days overdue
    </span>
  )},
];

// ── Subscription detailed columns ─────────────────────────────────────────────
const SUB_DETAIL_COLS = [
  { key: 'subscriptionNumber', label: 'Subscription #' },
  { key: 'customerName',       label: 'Customer' },
  { key: 'planName',           label: 'Plan' },
  { key: 'billingInterval',    label: 'Interval', render: (r) => <span className="capitalize">{r.billingInterval ?? 'monthly'}</span> },
  { key: 'status',             label: 'Status', render: (r) => <Badge status={r.status} /> },
  { key: 'startDate',          label: 'Start Date', render: (r) => safeDate(r.startDate) },
  { key: 'expiryDate',         label: 'Expiry Date', render: (r) => safeDate(r.expiryDate) },
];

const subStatusCols = [
  { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  { key: 'count',  label: 'Count' },
];

const subPlanCols = [
  { key: 'plan',        label: 'Plan' },
  { key: 'count',       label: 'Total' },
  { key: 'activeCount', label: 'Active' },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState(0);

  // Revenue filters & state
  const [revFilters, setRevFilters] = useState({});
  const [revData,    setRevData]    = useState({ rows: [], totals: {} });
  const [loadingRev, setLoadingRev] = useState(false);

  // Overdue
  const [ovdData,    setOvdData]    = useState({ rows: [] });
  const [loadingOvd, setLoadingOvd] = useState(false);

  // Subscriptions filters & state
  const [subFilters, setSubFilters] = useState({});
  const [subData,    setSubData]    = useState({ byStatus: [], byPlan: [], rows: [] });
  const [loadingSub, setLoadingSub] = useState(false);

  const loadRevenue = useCallback(async () => {
    setLoadingRev(true);
    try {
      const d = await fetchRevenueReport(revFilters);
      setRevData(d);
    } catch {
      setRevData({ rows: [], totals: {} });
    } finally {
      setLoadingRev(false);
    }
  }, [revFilters]);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSub(true);
    try {
      const d = await fetchSubscriptionReport(subFilters);
      setSubData(d);
    } catch {
      setSubData({ byStatus: [], byPlan: [], rows: [] });
    } finally {
      setLoadingSub(false);
    }
  }, [subFilters]);

  useEffect(() => {
    if (tab === 0) loadRevenue();
  }, [tab, loadRevenue]);

  useEffect(() => {
    if (tab === 1) {
      setLoadingOvd(true);
      fetchOverdueReport()
        .then(setOvdData)
        .catch(() => setOvdData({ rows: [] }))
        .finally(() => setLoadingOvd(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 2) loadSubscriptions();
  }, [tab, loadSubscriptions]);

  return (
    <div>
      <PageHeader
        title="Financial & Subscription Reports"
        subtitle="Real-time analytics, overdue aging, subscription status breakdown, and CSV exports"
        action={
          tab === 0 ? (
            <button
              className="btn-primary text-sm shadow-sm"
              onClick={() => downloadRevenueCsv(revFilters)}
            >
              ⬇ Export Revenue CSV
            </button>
          ) : null
        }
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 border-b border-neutral-200">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              i === tab
                ? 'border-primary-600 text-primary-700 bg-primary-50/50 rounded-t-lg'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Revenue ───────────────────────────────────────────────── */}
      {tab === 0 && (
        <>
          <FilterBar
            filters={revFilters}
            onChange={setRevFilters}
            onClear={() => setRevFilters({})}
            statuses={['draft', 'confirmed', 'sent', 'paid', 'cancelled']}
            statusLabel="Invoice Status"
            showCustomer={true}
          />

          {/* Totals summary bar */}
          {!loadingRev && revData.rows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Total Invoiced',    value: currency(revData.totals?.totalInvoiced),    color: 'text-neutral-900', border: 'border-neutral-200' },
                { label: 'Total Received',    value: currency(revData.totals?.totalReceived),    color: 'text-emerald-700', border: 'border-emerald-200 bg-emerald-50/30' },
                { label: 'Total Outstanding', value: currency(revData.totals?.totalOutstanding), color: 'text-amber-700',   border: 'border-amber-200 bg-amber-50/30' },
              ].map((s) => (
                <div key={s.label} className={`card py-3 px-4 border ${s.border}`}>
                  <p className="text-xs font-medium text-neutral-500 mb-0.5">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <DataTable
            columns={REV_COLS}
            rows={revData.rows}
            loading={loadingRev}
            emptyMsg="No invoices match the selected date, status, or customer filters."
          />
        </>
      )}

      {/* ── Tab 1: Overdue ───────────────────────────────────────────────── */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <strong>Aging Notice:</strong> Overdue invoices represent confirmed invoices where payment has not been received past the specified due date.
          </div>
          <DataTable
            columns={OVD_COLS}
            rows={ovdData.rows ?? []}
            loading={loadingOvd}
            emptyMsg="Great job! There are currently no overdue invoices."
          />
        </div>
      )}

      {/* ── Tab 2: Subscriptions ─────────────────────────────────────────── */}
      {tab === 2 && (
        <div className="space-y-6">
          <FilterBar
            filters={subFilters}
            onChange={setSubFilters}
            onClear={() => setSubFilters({})}
            statuses={['active', 'draft', 'quotation', 'confirmed', 'closed']}
            statusLabel="Subscription Status"
            showCustomer={true}
          />

          {/* Aggregations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Subscriptions by Status</h3>
              <DataTable columns={subStatusCols} rows={subData.byStatus ?? []} loading={loadingSub} emptyMsg="No status aggregation data" />
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Subscriptions by Plan</h3>
              <DataTable columns={subPlanCols} rows={subData.byPlan ?? []} loading={loadingSub} emptyMsg="No plan aggregation data" />
            </div>
          </div>

          {/* Detailed filterable rows */}
          {subData.rows && subData.rows.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Filtered Subscriptions</h3>
              <DataTable
                columns={SUB_DETAIL_COLS}
                rows={subData.rows}
                loading={loadingSub}
                emptyMsg="No subscriptions match the selected filters."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

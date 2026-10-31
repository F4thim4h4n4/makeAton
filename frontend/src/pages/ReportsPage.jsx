/**
 * ReportsPage  (Member 4 – feature/dashboard-portal)
 *
 * Tabbed reports view:
 *   Tab 1 – Revenue Report (filterable, exportable as CSV)
 *   Tab 2 – Overdue Invoices (aging table)
 *   Tab 3 – Subscriptions (by status and plan)
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

const TABS = ['Revenue', 'Overdue Invoices', 'Subscriptions'];

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
  { key: 'amountPaid',    label: 'Paid',     render: (r) => <span className="text-emerald-700">{currency(r.amountPaid)}</span> },
  { key: 'outstandingAmount', label: 'Outstanding', render: (r) => <span className="text-amber-700">{currency(r.outstandingAmount)}</span> },
  { key: 'dueDate',       label: 'Due Date', render: (r) => safeDate(r.dueDate) },
  { key: 'createdAt',     label: 'Created',  render: (r) => safeDate(r.createdAt) },
];

// ── Overdue columns ───────────────────────────────────────────────────────────
const OVD_COLS = [
  { key: 'invoiceNumber',    label: 'Invoice #' },
  { key: 'customerName',     label: 'Customer' },
  { key: 'outstandingAmount',label: 'Outstanding', render: (r) => <span className="font-medium text-red-700">{currency(r.outstandingAmount)}</span> },
  { key: 'dueDate',          label: 'Due Date',    render: (r) => safeDate(r.dueDate) },
  { key: 'daysOverdue',      label: 'Days Overdue',render: (r) => (
    <span className={`font-semibold ${r.daysOverdue > 60 ? 'text-red-700' : r.daysOverdue > 30 ? 'text-amber-600' : 'text-neutral-700'}`}>
      {r.daysOverdue}d
    </span>
  )},
];

// ── Subscription columns ──────────────────────────────────────────────────────
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
  const [filters, setFilters] = useState({});

  // Revenue
  const [revData,    setRevData]    = useState({ rows: [], totals: {} });
  const [loadingRev, setLoadingRev] = useState(false);

  // Overdue
  const [ovdData,    setOvdData]    = useState({ rows: [] });
  const [loadingOvd, setLoadingOvd] = useState(false);

  // Subscriptions
  const [subData,    setSubData]    = useState({ byStatus: [], byPlan: [] });
  const [loadingSub, setLoadingSub] = useState(false);

  const loadRevenue = useCallback(async () => {
    setLoadingRev(true);
    try {
      const d = await fetchRevenueReport(filters);
      setRevData(d);
    } catch { setRevData({ rows: [], totals: {} }); }
    finally { setLoadingRev(false); }
  }, [filters]);

  useEffect(() => {
    if (tab === 0) loadRevenue();
  }, [tab, loadRevenue]);

  useEffect(() => {
    if (tab === 1) {
      setLoadingOvd(true);
      fetchOverdueReport().then(setOvdData).catch(() => setOvdData({ rows: [] })).finally(() => setLoadingOvd(false));
    }
    if (tab === 2) {
      setLoadingSub(true);
      fetchSubscriptionReport().then(setSubData).catch(() => setSubData({ byStatus: [], byPlan: [] })).finally(() => setLoadingSub(false));
    }
  }, [tab]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Detailed financial and subscription analytics"
        action={
          tab === 0 ? (
            <button
              className="btn-primary text-sm"
              onClick={() => downloadRevenueCsv(filters)}
            >
              ⬇ Export CSV
            </button>
          ) : null
        }
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 border-b border-neutral-200">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              i === tab
                ? 'border-primary-600 text-primary-700'
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
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters({})}
            statuses={['draft', 'confirmed', 'sent', 'paid', 'cancelled']}
          />

          {/* Totals summary bar */}
          {!loadingRev && revData.rows.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total Invoiced',   value: currency(revData.totals?.totalInvoiced),   color: 'text-neutral-800' },
                { label: 'Total Received',   value: currency(revData.totals?.totalReceived),   color: 'text-emerald-700' },
                { label: 'Total Outstanding',value: currency(revData.totals?.totalOutstanding),color: 'text-amber-700'   },
              ].map((s) => (
                <div key={s.label} className="card py-3 px-4">
                  <p className="text-xs text-neutral-500 mb-0.5">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <DataTable columns={REV_COLS} rows={revData.rows} loading={loadingRev} emptyMsg="No invoices match the selected filters" />
        </>
      )}

      {/* ── Tab 1: Overdue ───────────────────────────────────────────────── */}
      {tab === 1 && (
        <DataTable columns={OVD_COLS} rows={ovdData.rows ?? []} loading={loadingOvd} emptyMsg="No overdue invoices 🎉" />
      )}

      {/* ── Tab 2: Subscriptions ─────────────────────────────────────────── */}
      {tab === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">By Status</h3>
            <DataTable columns={subStatusCols} rows={subData.byStatus ?? []} loading={loadingSub} emptyMsg="No subscription data" />
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">By Plan</h3>
            <DataTable columns={subPlanCols} rows={subData.byPlan ?? []} loading={loadingSub} emptyMsg="No plan data" />
          </div>
        </div>
      )}
    </div>
  );
}

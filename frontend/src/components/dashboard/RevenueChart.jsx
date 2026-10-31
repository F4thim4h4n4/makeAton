/**
 * RevenueChart  –  Area/bar chart showing revenue vs invoiced amounts
 *
 * Uses recharts AreaChart. Accepts period selector: 7d / 30d / 90d / 12m
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { fetchDashboardCharts } from '../../services/dashboardService.js';
import { format, parseISO } from 'date-fns';

const PERIODS = [
  { value: '30d',  label: '30 Days' },
  { value: '90d',  label: '90 Days' },
  { value: '12m',  label: '12 Months' },
];

const fmt = (d, period) => {
  try {
    const parsed = parseISO(period === '12m' ? `${d}-01` : d);
    return period === '12m' ? format(parsed, 'MMM yy') : format(parsed, 'dd MMM');
  } catch {
    return d;
  }
};

const currency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v ?? 0);

function mergeData(revenueData, invoicedData, period) {
  const map = {};
  revenueData.forEach(({ date, revenue }) => {
    map[date] = { date, revenue: revenue ?? 0, invoiced: 0, label: fmt(date, period) };
  });
  invoicedData.forEach(({ date, invoiced }) => {
    if (!map[date]) map[date] = { date, revenue: 0, invoiced: 0, label: fmt(date, period) };
    map[date].invoiced = invoiced ?? 0;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

export default function RevenueChart() {
  const [period, setPeriod] = useState('30d');
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDashboardCharts(period);
      setData(mergeData(res.revenueData ?? [], res.invoicedData ?? [], period));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Revenue Overview</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Revenue received vs invoiced amounts</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-56 bg-neutral-100 rounded-lg animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-neutral-400 text-sm">
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradInvoiced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v, name) => [currency(v), name === 'revenue' ? 'Revenue' : 'Invoiced']} labelStyle={{ fontSize: 12 }} />
            <Legend formatter={(name) => name === 'revenue' ? 'Revenue' : 'Invoiced'} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="invoiced" stroke="#10b981" strokeWidth={2} fill="url(#gradInvoiced)" dot={false} />
            <Area type="monotone" dataKey="revenue"  stroke="#2563eb" strokeWidth={2} fill="url(#gradRevenue)"  dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

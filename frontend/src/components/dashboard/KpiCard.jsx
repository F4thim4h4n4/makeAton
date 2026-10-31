/**
 * KpiCard  –  Dashboard KPI summary card
 *
 * Props:
 *   icon      – emoji or SVG element
 *   label     – metric name
 *   value     – formatted value string
 *   sub       – optional subtitle / change indicator
 *   color     – 'blue' | 'green' | 'amber' | 'red'  (default: 'blue')
 *   loading   – shows skeleton when true
 */

const COLOR = {
  blue:  { icon: 'bg-primary-100 text-primary-600',  border: 'border-l-primary-500'  },
  green: { icon: 'bg-emerald-100 text-emerald-600',  border: 'border-l-emerald-500'  },
  amber: { icon: 'bg-amber-100   text-amber-600',    border: 'border-l-amber-500'    },
  red:   { icon: 'bg-red-100     text-red-600',      border: 'border-l-red-500'      },
};

export default function KpiCard({ icon, label, value, sub, color = 'blue', loading = false }) {
  const c = COLOR[color] ?? COLOR.blue;

  if (loading) {
    return (
      <div className="card border-l-4 border-l-neutral-200 animate-pulse">
        <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-neutral-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-neutral-100 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className={`card border-l-4 ${c.border} hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
        </div>
        <span className={`p-2.5 rounded-lg text-xl ${c.icon}`}>{icon}</span>
      </div>
    </div>
  );
}

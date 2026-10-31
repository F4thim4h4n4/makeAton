/**
 * RecentTable  –  compact activity table for dashboard panels
 *
 * Props:
 *   columns – array of { key, label, render? }
 *   rows    – array of objects
 *   loading – boolean
 *   emptyMsg – string shown when rows is empty
 */

import Badge from '../ui/Badge.jsx';

export { Badge };

export default function RecentTable({ columns = [], rows = [], loading = false, emptyMsg = 'No records yet' }) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-neutral-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="py-10 text-center text-sm text-neutral-400">{emptyMsg}</div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-neutral-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2.5 text-neutral-700 whitespace-nowrap">
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

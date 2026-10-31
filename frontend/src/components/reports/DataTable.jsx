/**
 * DataTable  –  paginated, sortable table for Reports pages
 *
 * Props:
 *   columns  – [{ key, label, render?, sortable? }]
 *   rows     – data array
 *   loading  – boolean
 *   emptyMsg – string
 */

import { useState } from 'react';

const PAGE_SIZE = 20;

export default function DataTable({ columns = [], rows = [], loading = false, emptyMsg = 'No records found' }) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey]   = useState(null);
  const [sortAsc, setSortAsc]   = useState(true);

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const va = a[sortKey] ?? '';
        const vb = b[sortKey] ?? '';
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sortAsc ? cmp : -cmp;
      })
    : rows;

  const pages   = Math.ceil(sorted.length / PAGE_SIZE);
  const visible = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-neutral-100 rounded" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                  className={`px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide
                    ${col.sortable !== false ? 'cursor-pointer select-none hover:text-neutral-800' : ''}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-neutral-400 text-sm">
                  {emptyMsg}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-neutral-700">
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-neutral-500">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded-md border border-neutral-200 disabled:opacity-40 hover:bg-neutral-100 transition-colors"
            >
              ‹
            </button>
            {[...Array(pages)].map((_, pi) => (
              <button
                key={pi}
                onClick={() => setPage(pi)}
                className={`px-3 py-1 rounded-md border transition-colors ${
                  pi === page
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {pi + 1}
              </button>
            ))}
            <button
              disabled={page === pages - 1}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded-md border border-neutral-200 disabled:opacity-40 hover:bg-neutral-100 transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

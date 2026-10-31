/**
 * FilterBar  –  Shared filter control row for Reports
 *
 * Props:
 *   filters      – { from, to, status, customer }
 *   onChange     – (updated) => void
 *   onClear      – () => void
 *   statuses     – string[] status options
 *   statusLabel  – string (default 'Status')
 *   showCustomer – boolean (default true)
 */

export default function FilterBar({
  filters = {},
  onChange,
  onClear,
  statuses = [],
  statusLabel = 'Status',
  showCustomer = true,
}) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <div className="flex flex-wrap gap-3 items-end mb-4 bg-white p-3.5 rounded-xl border border-neutral-200">
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">From Date</label>
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => set('from', e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">To Date</label>
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => set('to', e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      {statuses.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">{statusLabel}</label>
          <select
            value={filters.status ?? ''}
            onChange={(e) => set('status', e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 capitalize"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      )}
      {showCustomer && (
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-neutral-600 mb-1">Search Customer / Ref</label>
          <input
            type="text"
            placeholder="Search by name, email, or number..."
            value={filters.customer ?? ''}
            onChange={(e) => set('customer', e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}
      <button
        onClick={onClear}
        className="btn-secondary text-xs py-2 px-3 self-end"
      >
        Clear Filters
      </button>
    </div>
  );
}

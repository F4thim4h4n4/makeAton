/**
 * FilterBar  –  Shared filter control row for Reports
 *
 * Props:
 *   filters  – { from, to, status, customerId }
 *   onChange – (updated) => void
 *   onClear  – () => void
 *   statuses – string[] status options
 */

export default function FilterBar({ filters = {}, onChange, onClear, statuses = [] }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <div className="flex flex-wrap gap-3 items-end mb-4">
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">From</label>
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => set('from', e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">To</label>
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => set('to', e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
      {statuses.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Status</label>
          <select
            value={filters.status ?? ''}
            onChange={(e) => set('status', e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      )}
      <button
        onClick={onClear}
        className="btn-secondary text-xs py-1.5 mt-auto"
      >
        Clear
      </button>
    </div>
  );
}

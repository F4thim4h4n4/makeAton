/**
 * Badge  –  semantic status badge component
 *
 * Usage:
 *   <Badge status="active" />
 *   <Badge status="overdue" />
 *   <Badge label="Draft" color="gray" />
 */

const STATUS_MAP = {
  active:    { label: 'Active',    bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  draft:     { label: 'Draft',     bg: 'bg-neutral-100', text: 'text-neutral-600', border: 'border-neutral-200' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-200'    },
  quotation: { label: 'Quotation', bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-200'  },
  closed:    { label: 'Closed',    bg: 'bg-neutral-200', text: 'text-neutral-700', border: 'border-neutral-300' },
  paid:      { label: 'Paid',      bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  overdue:   { label: 'Overdue',   bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-200'     },
  pending:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200'   },
  cancelled: { label: 'Cancelled', bg: 'bg-neutral-100', text: 'text-neutral-500', border: 'border-neutral-200' },
  sent:      { label: 'Sent',      bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-200'     },
  paused:    { label: 'Paused',    bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-200'  },
};

export default function Badge({ status, label, className = '' }) {
  const key = status?.toLowerCase();
  const map = STATUS_MAP[key] ?? { label: label ?? status ?? '—', bg: 'bg-neutral-100', text: 'text-neutral-600', border: 'border-neutral-200' };
  const display = label ?? map.label;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        border ${map.bg} ${map.text} ${map.border} ${className}`}
    >
      {display}
    </span>
  );
}

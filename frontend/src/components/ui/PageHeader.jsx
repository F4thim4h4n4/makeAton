/**
 * PageHeader  –  consistent page title + subtitle + optional action slot
 *
 * Usage:
 *   <PageHeader
 *     title="Dashboard"
 *     subtitle="Overview of your subscription business"
 *     action={<button className="btn-primary">Export</button>}
 *   />
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

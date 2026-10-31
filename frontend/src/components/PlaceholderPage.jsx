/**
 * PlaceholderPage
 * Generic placeholder used by every unimplemented module page.
 *
 * Props:
 *   title       – Page / module name (string)
 *   description – Short description of what this module will do (string)
 *   owner       – Team member responsible for this module (string)
 *   features    – Bullet list of planned features (string[])
 */
function PlaceholderPage({ title, description, owner, features = [] }) {
  return (
    <div className="max-w-2xl mx-auto mt-10">
      {/* Placeholder badge */}
      <div className="mb-4">
        <span className="badge-placeholder">🚧 Placeholder – Not Yet Implemented</span>
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-neutral-900 mb-2">{title}</h2>
      <p className="text-neutral-500 mb-6">{description}</p>

      <div className="card space-y-4">
        {/* Owner */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Assigned to
          </p>
          <p className="text-sm font-medium text-neutral-700">{owner}</p>
        </div>

        {/* Planned features */}
        {features.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Planned Features
            </p>
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-600">
                  <span className="mt-0.5 text-neutral-300">•</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dev note */}
        <p className="text-xs text-neutral-400 pt-2 border-t border-neutral-100">
          Replace this component with the real implementation when the module is ready.
        </p>
      </div>
    </div>
  );
}

export default PlaceholderPage;

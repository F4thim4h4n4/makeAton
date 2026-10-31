import { NavLink } from 'react-router-dom';
import navItems from '../routes/navItems.js';

/**
 * Sidebar
 * Renders the primary navigation grouped by section.
 * Uses NavLink so the active route is highlighted automatically.
 */
function Sidebar() {
  // Build a grouped map: { 'Overview': [...], 'Catalog': [...], ... }
  const groups = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shrink-0 overflow-y-auto">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-neutral-200 shrink-0">
        <span className="text-primary-600 font-bold text-lg tracking-tight">
          SubsManager
        </span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {group}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-link${isActive ? ' active' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-neutral-200 text-xs text-neutral-400">
        MakeAton Hackathon · v0.1.0
      </div>
    </aside>
  );
}

export default Sidebar;

import { NavLink } from 'react-router-dom';
import navItems from '../routes/navItems.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Sidebar  (Member 4 – feature/dashboard-portal)
 *
 * – Displays nav items grouped by section with emoji icons.
 * – role  prop (from auth context when Member 2 merges) filters visible items.
 *   Until then, admin/staff items are shown to everyone.
 */
function Sidebar({ role = 'admin' }) {
  // Filter nav items by role (ready for Member 2's auth context)
  const visible = navItems.filter((item) => !item.roles || item.roles.includes(role));

  const groups = visible.reduce((acc, item) => {
 * Sidebar
 * Renders the primary navigation grouped by section, respecting role permissions.
 */
function Sidebar() {
  const { user } = useAuth();
  const currentRole = user?.role || 'customer';

  // Filter items based on user role
  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(currentRole)
  );

  // Group items by section
  const groups = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shrink-0 overflow-y-auto">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            B
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-900 leading-tight">Brightloop</p>
            <p className="text-xs text-neutral-400 leading-tight">Subscription Manager</p>
          </div>
      <div className="h-16 flex items-center px-5 border-b border-neutral-200 shrink-0 gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
          B
        </div>
        <div>
          <span className="text-neutral-900 font-bold text-base tracking-tight block">
            Brightloop
          </span>
          <span className="text-[10px] text-neutral-400 font-medium block -mt-1">
            Subscription Platform
          </span>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
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
                    {item.icon && (
                      <span className="text-base leading-none shrink-0">{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-neutral-200">
        <p className="text-xs text-neutral-400">MakeAton Hackathon · v0.1.0</p>
      <div className="px-5 py-4 border-t border-neutral-200 text-xs text-neutral-400">
        <div className="font-medium text-neutral-600">Brightloop Software</div>
        <div>MakeAton Hackathon · Team 4</div>
      </div>
    </aside>
  );
}

export default Sidebar;

import { useLocation, Link } from 'react-router-dom';
import navItems from '../routes/navItems.js';

/**
 * Topbar  (Member 4 – feature/dashboard-portal)
 *
 * – Shows current page title derived from navItems config.
 * – Notification bell (visual only until Member 3's overdue data is wired).
 * – User avatar with role badge (role from auth context when Member 2 merges).
 */
function Topbar({ role = 'admin', userName = 'Admin' }) {
  const { pathname } = useLocation();
  const current = navItems.find((item) => item.path === pathname);
  const pageTitle = current?.label ?? 'Subscription Management System';

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleBadgeColor = {
    admin: 'bg-primary-100 text-primary-700',
    staff: 'bg-violet-100 text-violet-700',
    customer: 'bg-emerald-100 text-emerald-700',
  }[role] ?? 'bg-neutral-100 text-neutral-600';

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0">
      {/* Page title */}
      <h1 className="text-base font-semibold text-neutral-800">{pageTitle}</h1>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell – stub (badge count from overdue API) */}
        <Link
          to="/reports"
          title="View reports"
          className="relative p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          🔔
        </Link>

        {/* User avatar + role */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold select-none">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-neutral-800 leading-tight">{userName}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadgeColor} capitalize`}>
              {role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;


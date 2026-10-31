import { useLocation } from 'react-router-dom';
import navItems from '../routes/navItems.js';

/**
 * Topbar
 * Displays the current page title derived from the active route.
 * Will host global actions (notifications, user menu) in a future iteration.
 */
function Topbar() {
  const { pathname } = useLocation();

  const current = navItems.find((item) => item.path === pathname);
  const pageTitle = current?.label ?? 'Subscription Management System';

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-neutral-800">{pageTitle}</h1>
      <div className="flex items-center gap-3">
        {/* Placeholder for user avatar / notifications – implement in Member 2/4 work */}
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-semibold">
          U
        </div>
      </div>
    </header>
  );
}

export default Topbar;

import { useLocation, useNavigate, Link } from 'react-router-dom';
import navItems from '../routes/navItems.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Topbar
 * Displays the current page title and logged-in user profile, role badge, and logout.
 */
function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const current = navItems.find((item) => item.path === pathname);
  const pageTitle = current?.label ?? 'Subscription Management System';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 shadow-xs">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-neutral-800">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-neutral-900">{user.name}</div>
              <div className="text-[10px] text-neutral-400">{user.email}</div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : user.role === 'staff'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {user.role}
            </span>

            <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <button
              onClick={handleLogout}
              className="text-xs font-medium text-neutral-500 hover:text-red-600 px-2 py-1 rounded hover:bg-neutral-50 transition-colors"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-xs font-semibold text-primary-600 hover:text-primary-800 px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export default Topbar;

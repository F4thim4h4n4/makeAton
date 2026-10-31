/**
 * Central navigation configuration  (Member 4 – updated: dashboard-portal)
 *
 * roles: which roles can see this nav item.
 *   'admin'    – full system access
 *   'staff'    – operational access
 *   'customer' – own data only
 * If roles is omitted, the item is shown to admin and staff.
 */
const navItems = [
  // ── Admin / Staff views ─────────────────────────────────────────────────
  { icon: '📊', label: 'Dashboard',          path: '/dashboard',       group: 'Overview',       roles: ['admin', 'staff'] },
  { icon: '📦', label: 'Products & Plans',   path: '/products',        group: 'Catalog',        roles: ['admin', 'staff'] },
  { icon: '🏷️', label: 'Discounts & Taxes',  path: '/discounts-taxes', group: 'Catalog',        roles: ['admin', 'staff'] },
  { icon: '👥', label: 'Customers',          path: '/customers',       group: 'Customers',      roles: ['admin', 'staff'] },
  { icon: '📝', label: 'Quotations',         path: '/quotations',      group: 'Customers',      roles: ['admin', 'staff'] },
  { icon: '🔄', label: 'Subscriptions',      path: '/subscriptions',   group: 'Subscriptions',  roles: ['admin', 'staff'] },
  { icon: '🧾', label: 'Invoices',           path: '/invoices',        group: 'Billing',        roles: ['admin', 'staff'] },
  { icon: '💳', label: 'Payments',           path: '/payments',        group: 'Billing',        roles: ['admin', 'staff'] },
  { icon: '📈', label: 'Reports',            path: '/reports',         group: 'Analytics',      roles: ['admin', 'staff'] },

  // ── Customer portal ─────────────────────────────────────────────────────
  { icon: '🏠', label: 'My Portal',          path: '/portal',          group: 'My Account',     roles: ['customer'] },
];

export default navItems;

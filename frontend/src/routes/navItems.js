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
 * Central navigation configuration.
 * Roles indicate which user types have access to view the navigation entry.
 */
const navItems = [
  { label: 'Dashboard',         path: '/dashboard',          group: 'Overview' },
  { label: 'Products',          path: '/products',           group: 'Catalog' },
  { label: 'Plans',             path: '/plans',              group: 'Catalog' },
  { label: 'Taxes',             path: '/taxes',              group: 'Catalog' },
  { label: 'Discounts',         path: '/discounts',          group: 'Catalog' },
  { label: 'Customers',         path: '/customers',          group: 'Customers' },
  { label: 'Quotations',        path: '/quotations',         group: 'Customers' },
  { label: 'Subscriptions',     path: '/subscriptions',      group: 'Subscriptions' },
  { label: 'Invoices',          path: '/invoices',           group: 'Billing' },
  { label: 'Payments',          path: '/payments',           group: 'Billing' },
  { label: 'Reports',           path: '/reports',            group: 'Analytics' },
  { label: 'Dashboard',         path: '/dashboard',          group: 'Overview',      roles: ['admin', 'staff', 'customer'] },
  { label: 'Products & Plans',  path: '/products',           group: 'Catalog',       roles: ['admin', 'staff'] },
  { label: 'Discounts & Taxes', path: '/discounts-taxes',    group: 'Catalog',       roles: ['admin', 'staff'] },
  { label: 'Customers',         path: '/customers',          group: 'Management',    roles: ['admin', 'staff'] },
  { label: 'Quotations',        path: '/quotations',         group: 'Subscriptions', roles: ['admin', 'staff', 'customer'] },
  { label: 'Subscriptions',     path: '/subscriptions',      group: 'Subscriptions', roles: ['admin', 'staff', 'customer'] },
  { label: 'Invoices',          path: '/invoices',           group: 'Billing',       roles: ['admin', 'staff', 'customer'] },
  { label: 'Payments',          path: '/payments',           group: 'Billing',       roles: ['admin', 'staff', 'customer'] },
  { label: 'Reports',           path: '/reports',            group: 'Analytics',     roles: ['admin', 'staff'] },
];

export default navItems;

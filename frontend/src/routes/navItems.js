/**
 * Central navigation configuration.
 * Roles indicate which user types have access to view the navigation entry.
 */
const navItems = [
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

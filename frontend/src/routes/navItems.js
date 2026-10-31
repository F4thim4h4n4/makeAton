/**
 * Central navigation configuration.
 * Each entry maps to a sidebar link and a React Router route.
 * Add icon components (e.g. from heroicons) when implementing the full UI.
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
];

export default navItems;

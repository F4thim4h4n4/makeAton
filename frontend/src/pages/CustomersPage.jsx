import PlaceholderPage from '../components/PlaceholderPage.jsx';

function CustomersPage() {
  return (
    <PlaceholderPage
      title="Customers"
      description="Manage customer accounts, contact information, and role-based access."
      owner="Member 2 – Authentication & Subscription Management (feature/subscriptions-auth)"
      features={[
        'Customer list with search and filter',
        'Customer detail view (contact info, subscriptions)',
        'Role-based access control (admin, billing, viewer)',
        'Customer status management (active, suspended)',
        'Link customers to quotations and subscriptions',
      ]}
    />
  );
}

export default CustomersPage;

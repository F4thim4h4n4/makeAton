import PlaceholderPage from '../components/PlaceholderPage.jsx';

function DashboardPage() {
  return (
    <PlaceholderPage
      title="Revenue Dashboard & Analytics"
      description="Central hub displaying key subscription metrics, MRR, churn rate, and revenue trends."
      owner="Member 4 – Dashboard & Customer Portal (feature/dashboard-portal)"
      features={[
        'Monthly Recurring Revenue (MRR) widget',
        'Active subscriptions count',
        'Churn rate indicator',
        'Revenue trend chart',
        'Recent activity feed',
        'Quick action shortcuts',
      ]}
    />
  );
}

export default DashboardPage;

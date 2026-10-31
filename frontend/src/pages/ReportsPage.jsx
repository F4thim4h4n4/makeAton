import PlaceholderPage from '../components/PlaceholderPage.jsx';

function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Generate and export revenue reports, subscription analytics, and billing summaries."
      owner="Member 4 – Dashboard & Customer Portal (feature/dashboard-portal)"
      features={[
        'Revenue by period report',
        'Subscription growth and churn report',
        'Invoice aging report',
        'Customer cohort analysis',
        'Export reports as CSV or PDF',
      ]}
    />
  );
}

export default ReportsPage;

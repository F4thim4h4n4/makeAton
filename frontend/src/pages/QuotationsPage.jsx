import PlaceholderPage from '../components/PlaceholderPage.jsx';

function QuotationsPage() {
  return (
    <PlaceholderPage
      title="Quotations"
      description="Create, send, and track subscription quotations for prospective customers."
      owner="Member 2 – Authentication & Subscription Management (feature/subscriptions-auth)"
      features={[
        'Draft and send quotations with selected plans',
        'Apply discounts to quotations',
        'Quotation status tracking (draft, sent, accepted, expired)',
        'Convert accepted quotation into an active subscription',
        'Quotation PDF export',
      ]}
    />
  );
}

export default QuotationsPage;

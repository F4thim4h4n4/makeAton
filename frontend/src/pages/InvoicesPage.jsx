import PlaceholderPage from '../components/PlaceholderPage.jsx';

function InvoicesPage() {
  return (
    <PlaceholderPage
      title="Invoices"
      description="View and manage recurring invoices generated for active subscriptions."
      owner="Member 3 – Billing & Payments (feature/billing-payments)"
      features={[
        'Automatic invoice generation on billing cycle',
        'Invoice status tracking (pending, paid, overdue, void)',
        'Duplicate invoice prevention',
        'Invoice PDF download',
        'Send invoice reminders by email',
        'Credit note issuance',
      ]}
    />
  );
}

export default InvoicesPage;

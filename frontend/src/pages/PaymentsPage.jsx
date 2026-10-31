import PlaceholderPage from '../components/PlaceholderPage.jsx';

function PaymentsPage() {
  return (
    <PlaceholderPage
      title="Payments"
      description="Record and track payment transactions linked to invoices."
      owner="Member 3 – Billing & Payments (feature/billing-payments)"
      features={[
        'Log payment receipts against invoices',
        'Partial payment recording',
        'Payment method tracking',
        'Failed payment alerts and retry logic',
        'Refund management',
        'Payment reconciliation report',
      ]}
    />
  );
}

export default PaymentsPage;

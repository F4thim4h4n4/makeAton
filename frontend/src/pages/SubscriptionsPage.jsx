import PlaceholderPage from '../components/PlaceholderPage.jsx';

function SubscriptionsPage() {
  return (
    <PlaceholderPage
      title="Subscriptions"
      description="View and manage the full lifecycle of customer subscriptions."
      owner="Member 2 – Authentication & Subscription Management (feature/subscriptions-auth)"
      features={[
        'Subscription list with status indicators',
        'Activate, pause, resume, and cancel subscriptions',
        'Renewal date tracking and notifications',
        'Upgrade / downgrade plan mid-cycle',
        'Subscription history and audit log',
      ]}
    />
  );
}

export default SubscriptionsPage;

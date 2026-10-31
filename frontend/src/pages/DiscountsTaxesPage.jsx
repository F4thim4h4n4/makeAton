import PlaceholderPage from '../components/PlaceholderPage.jsx';

function DiscountsTaxesPage() {
  return (
    <PlaceholderPage
      title="Discounts & Taxes"
      description="Configure promotional discount codes and tax rates applied to subscription plans."
      owner="Member 1 – Product & Pricing Management (feature/catalog-pricing)"
      features={[
        'Create percentage and flat-rate discount codes',
        'Set discount validity windows and usage limits',
        'Define tax rates by region or category',
        'Assign tax profiles to products and plans',
        'Preview effective price after discounts and taxes',
      ]}
    />
  );
}

export default DiscountsTaxesPage;

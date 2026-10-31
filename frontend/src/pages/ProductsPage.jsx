import PlaceholderPage from '../components/PlaceholderPage.jsx';

function ProductsPage() {
  return (
    <PlaceholderPage
      title="Products & Subscription Plans"
      description="Manage products, product variants, and subscription plan configurations."
      owner="Member 1 – Product & Pricing Management (feature/catalog-pricing)"
      features={[
        'Create and edit products',
        'Define product variants (e.g. monthly / annual)',
        'Configure subscription plans',
        'Set plan pricing and billing intervals',
        'Attach tax profiles to products',
        'Archive discontinued plans',
      ]}
    />
  );
}

export default ProductsPage;
